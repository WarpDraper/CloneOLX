import { fetchBaseQuery } from "@reduxjs/toolkit/query/react"; // краще імпортувати з /react
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { APP_ENV } from "../env";
import type { RootState } from "../store";
import { addNotification } from "../store/notificationSlice";
import { logout, setAuth } from "../Slice/authSlice";
import { getStoredToken } from "./tokenUtils";

// Shared base query for every *Service.ts RTK Query slice. Wraps fetchBaseQuery with
// request/response/error console logging (see debug logging spec): every request is
// logged in dev, every failed response (4xx/5xx/CORS/network) is logged via console.error
// with status + endpoint regardless of environment, so backend issues are visible in prod too.
//
// Backend-unreachable errors (ERR_CONNECTION_REFUSED, dev API down, CORS preflight failure)
// are additionally throttled to a SINGLE user-facing notification + console line per cooldown
// window instead of one per failed request — every *Service.ts slice shares this module-level
// state, so a page that fires a dozen queries against a dead backend surfaces one toast, not
// a dozen ("Бекенд не відповідає" spam).
const UNREACHABLE_NOTICE_COOLDOWN_MS = 30_000;
let lastUnreachableNoticeAt = 0;

// Best-effort extraction of a human-readable message out of whatever the backend sent back.
// GlobalExceptionHandlerMiddleware (see OLX.API) serializes most errors as `{ message }`,
// FluentValidation errors as a `{ propertyName: [messages] }` map, and ASP.NET's own model
// binding failures as a ProblemDetails-shaped `{ title }` — try each in turn before giving up.
const extractErrorMessage = (error: FetchBaseQueryError): string | undefined => {
    const data = error.data as Record<string, unknown> | undefined;
    if (!data || typeof data !== "object") return undefined;
    if (typeof data.message === "string") return data.message;
    if (typeof data.title === "string") return data.title;
    const firstValidationMessages = Object.values(data).find((v) => Array.isArray(v) && typeof v[0] === "string");
    if (Array.isArray(firstValidationMessages)) return firstValidationMessages[0] as string;
    return undefined;
};

// GlobalExceptionHandlerMiddleware (OLX.API) now echoes ASP.NET Core's per-request
// TraceIdentifier back as `requestId` on every error body it produces (and as an
// `X-Request-Id` response header, for responses that bypass that middleware). Surfacing it in
// every console line below means a failure a user reports can be grep'd straight out of the
// server-side logs by this id, instead of trying to reconstruct "which request was that" from a
// timestamp.
const extractRequestId = (error: FetchBaseQueryError): string | undefined => {
    const data = error.data as Record<string, unknown> | undefined;
    if (data && typeof data === "object" && typeof data.requestId === "string") return data.requestId;
    return undefined;
};

// Requests whose failures are already surfaced inline by the calling form/component
// (LoginForm, RegisterForm, GoogleAuthButton — see their local formError/onError handling) and
// must never ALSO be pushed into the global toast queue. Without this, a wrong-password 400 on
// /api/Account/login produced two error surfaces for the same failure: the form's own inline
// message right away, plus a duplicate queued in notificationSlice that (before NotificationManager
// was mounted globally, see App.tsx) sat unrendered until the user navigated to a page that
// happened to mount it — then every queued login-page failure popped at once. Keyed by
// [endpoint, url] so only these specific auth-entry requests are silenced; every other /api/Account/*
// call (favorites, edit profile, newsletter, ...) still gets the normal global-toast treatment.
const SILENCED_GLOBAL_TOAST_REQUESTS: ReadonlyArray<{ endpoint: string; url: string }> = [
    { endpoint: "Account", url: "/login" },
    { endpoint: "Account", url: "/register/user" },
    { endpoint: "Account", url: "/login/google" },
    { endpoint: "Account", url: "/telegram-login" },
];

const isSilencedGlobalToastRequest = (endpoint: string, requestUrl: string): boolean =>
    SILENCED_GLOBAL_TOAST_REQUESTS.some((entry) => entry.endpoint === endpoint && entry.url === requestUrl);

// Endpoints whose 401 is the authoritative signal that the session itself is dead. A 401 from
// anywhere else — background polling (Notification/top-unread), chat, presence, favorites, ...
// — is far more often caused by a request racing ahead of auth state (fired before
// prepareHeaders picks up a token that's mid-sync, e.g. right after login or on a hard
// refresh) than by an actually-expired session. Auto-logging out on those tore down perfectly
// good sessions the instant the Header mounted (see Header.tsx's top-unread query). Session
// validity is now only ever treated as disproven by a 401 on one of these core endpoints —
// everything else just logs and lets the caller's own `data`/`error` handle the miss (RTK
// Query already returns `undefined` data on error, so callers like Header degrade to "no
// notifications yet" instead of crashing).
const CRITICAL_AUTH_REQUESTS: ReadonlyArray<{ endpoint: string; urlPrefix: string }> = [
    { endpoint: "Account", urlPrefix: "/profile" },
    { endpoint: "Account", urlPrefix: "/me" },
    // AccountController's actual route is POST /api/Account/user/refresh, not /refresh — kept in
    // sync with REFRESH_URL below so this list and the silent-refresh call below can never drift.
    { endpoint: "Account", urlPrefix: "/user/refresh" },
];

const isCriticalAuthRequest = (endpoint: string, requestUrl: string): boolean =>
    CRITICAL_AUTH_REQUESTS.some((entry) => entry.endpoint === endpoint && requestUrl.startsWith(entry.urlPrefix));

// --- Silent refresh -----------------------------------------------------------------------
// Previously a 401 on a CRITICAL_AUTH_REQUESTS endpoint went straight to dispatch(logout()) —
// there was no attempt to use the refresh token first, even though AccountController.RefreshTokens
// (POST /api/Account/user/refresh) exists and works. The refresh token itself lives in an
// HttpOnly cookie (see AccountController.SetRefreshTokenCookie) — it's deliberately
// inaccessible to JS, so "using the stored refreshToken" here means letting the browser attach
// that cookie via credentials: 'include', not reading one out of localStorage.
const REFRESH_URL = "/user/refresh";

// A dedicated fetchBaseQuery instance rather than reusing accountService's RTK Query endpoints:
// this module is imported BY accountService.ts (via createBaseQuery("Account")), so calling back
// into accountService here would be a circular dependency. Every *Service.ts instance (Account,
// Advert, Notification, Chat, ...) shares this one refresh call/in-flight promise below, so a
// page that fires several guarded queries at once when the access token has expired triggers
// exactly one refresh request, not one per failed query.
const refreshBaseQuery = fetchBaseQuery({
    baseUrl: `${APP_ENV.API_BASE_URL}/api/Account`,
    credentials: "include",
});

let refreshPromise: Promise<string | null> | null = null;

// Attempts POST /api/Account/user/refresh once (de-duplicated across concurrent callers via
// refreshPromise) and, on success, stores the new access token via setAuth (Redux + localStorage,
// see authSlice.setAuth) so the retried request's prepareHeaders picks it up. Returns null when
// the refresh endpoint itself fails (expired/rotated/missing refresh-token cookie — "no
// refreshToken exists" from the caller's point of view), which is the only case that should still
// fall through to logout() below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural subset of RTK Query's
// BaseQueryApi; `any` on dispatch's parameter avoids fighting redux's generic Dispatch<A> variance
// for what is otherwise just "something with a dispatch method" (see call site below).
const performTokenRefresh = (api: { dispatch: (action: any) => void }): Promise<string | null> => {
    if (!refreshPromise) {
        refreshPromise = (async () => {
            try {
                const result = await refreshBaseQuery({ url: REFRESH_URL, method: "POST" }, api as never, {});
                if (result.error) {
                    if (import.meta.env.DEV) {
                        console.warn("[Auth] Silent refresh failed:", result.error);
                    }
                    return null;
                }
                const newToken = (result.data as { accessToken?: string } | undefined)?.accessToken;
                if (!newToken) return null;
                api.dispatch(setAuth({ accessToken: newToken }));
                return newToken;
            } catch (err) {
                if (import.meta.env.DEV) {
                    console.warn("[Auth] Silent refresh threw:", err);
                }
                return null;
            }
        })();
        // Clear the shared in-flight promise once it settles so the NEXT expired-token 401
        // (e.g. after the newly-refreshed token itself expires later) triggers a fresh refresh
        // instead of forever replaying this one's (possibly stale) result.
        refreshPromise.finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
};

export const createBaseQuery = (endpoint: string) => {
    const rawBaseQuery = fetchBaseQuery({
        baseUrl: `${APP_ENV.API_BASE_URL}/api/${endpoint}`,
        // The refresh token lives in an HttpOnly cookie set by the API (different origin/port
        // than the Vite dev server), so every request must opt in to sending/receiving cookies —
        // without this, login/refresh silently drop the cookie and the API's CORS
        // AllowCredentials() policy has nothing to match against.
        credentials: 'include',
        prepareHeaders: (headers, { getState }) => {
            // Fall back to localStorage when the Redux slice hasn't caught up yet (e.g. the
            // very first request fired in the tick right after setAuth/page load, before this
            // slice's state has re-rendered downstream consumers) — see getStoredToken for why
            // this can't just be `localStorage.getItem('token')`.
            const token = (getState() as RootState).auth.token ?? getStoredToken();

            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
                // Diagnostic only (kept terse — never logs the full token): confirms a request
                // actually left with an Authorization header attached, to distinguish "we sent
                // no/a stale token" from "the backend rejected a token we believed was good" when
                // chasing a 401 on a CRITICAL_AUTH_REQUESTS endpoint (see below).
                if (import.meta.env.DEV) {
                    console.log(`[Auth Header Attached] ${endpoint}:`, `Bearer ${token.slice(0, 10)}...`);
                }
            } else if (import.meta.env.DEV) {
                console.warn(`[Auth Header Missing] ${endpoint}: no token in Redux state or localStorage for this request.`);
            }
            return headers;
        },
    });

    const loggingBaseQuery: typeof rawBaseQuery = async (args, api, extraOptions) => {
        if (import.meta.env.DEV) {
            console.log(`[API →] ${endpoint}`, args);
        }

        let result = await rawBaseQuery(args, api, extraOptions);

        if (result.error?.status === 401) {
            // Attempt a silent refresh-and-retry BEFORE any of the logout/toast handling below
            // ever sees this 401. Skipped for: public auth-entry endpoints (a wrong-password 401
            // on /login is not an expired session), the refresh call itself (would recurse), and
            // callers with no session to begin with (an anonymous background poll 401ing is not
            // something a refresh could fix — there's no refresh-token cookie to use).
            const requestUrlForRefresh = typeof args === "string" ? args : args.url;
            const isPublicAuthEndpoint = isSilencedGlobalToastRequest(endpoint, requestUrlForRefresh);
            const isRefreshCall = endpoint === "Account" && requestUrlForRefresh.startsWith(REFRESH_URL);
            const hadSession = Boolean(
                (api.getState() as RootState).auth.isAuth || (api.getState() as RootState).auth.token || getStoredToken()
            );

            if (!isPublicAuthEndpoint && !isRefreshCall && hadSession) {
                const newToken = await performTokenRefresh(api);
                if (newToken) {
                    // Refresh succeeded — retry the original request once. prepareHeaders reads
                    // the token fresh from Redux state/localStorage (see above), so the new
                    // Authorization header is picked up automatically.
                    result = await rawBaseQuery(args, api, extraOptions);
                }
                // newToken === null means the refresh endpoint itself returned 401/errored (no
                // usable refresh-token cookie) — fall through with the ORIGINAL 401 result so the
                // existing handling below can still log the user out for a critical endpoint.
            }
        }

        if (result.error) {
            // Single clear, formatted line for every failed request, in every environment (not
            // just DEV) — "no silent failures" means this must be visible in the prod console
            // too, not just logged as part of the richer per-branch context objects below.
            // `args` is either a bare url string or a FetchArgs object ({ url, method, ... }),
            // so the request path has to be read out of whichever shape it is.
            const requestUrl = typeof args === "string" ? args : args.url;
            const requestId = extractRequestId(result.error);
            console.error(`[API ERROR ${result.error.status}] ${requestUrl}:`, {
                status: result.error.status,
                data: result.error.data,
                endpoint: requestUrl,
                requestId,
            });

            if (isBackendUnreachable(result.error)) {
                // Single throttled notification + console line for the whole app, not one per
                // failed request — see cooldown note above.
                const now = Date.now();
                if (now - lastUnreachableNoticeAt > UNREACHABLE_NOTICE_COOLDOWN_MS) {
                    lastUnreachableNoticeAt = now;
                    console.error(`[API ✕] Backend unreachable`, { endpoint, request: args, status: result.error.status, requestId });
                    api.dispatch(
                        addNotification({
                            type: "error",
                            title: "Немає з'єднання",
                            message: "Бекенд не відповідає",
                        })
                    );
                }
            } else if (result.error.status === 401) {
                // Only a 401 on one of CRITICAL_AUTH_REQUESTS (Account/profile, Account/me, a
                // refresh-token call, ...) is trusted as proof the session itself is dead — see
                // that list's comment for why everything else (background polling, chat,
                // presence, favorites, ...) is deliberately NOT treated as a logout signal
                // anymore. A 401 from a public auth-entry endpoint (wrong password on /login,
                // ...) must also never tear down an unrelated already-valid session, even in the
                // edge case where an authenticated user re-submits the login form —
                // isSilencedGlobalToastRequest already tracks exactly that endpoint list, so
                // reuse it here instead of duplicating it.
                console.error(`[API ✕] ${endpoint}`, {
                    request: args,
                    status: result.error.status,
                    error: result.error.data ?? result.error,
                    requestId,
                });
                const state = api.getState() as RootState;
                const isPublicAuthEndpoint = isSilencedGlobalToastRequest(endpoint, requestUrl);
                if (!isPublicAuthEndpoint && isCriticalAuthRequest(endpoint, requestUrl) && (state.auth.isAuth || state.auth.token)) {
                    api.dispatch(logout());
                }
            } else if (isSilencedGlobalToastRequest(endpoint, requestUrl)) {
                // Auth-entry request whose caller already shows this error inline — log it (so
                // it's still visible in the console/network tab) but skip the global toast
                // entirely, on every status code including 401 (locked-out/invalid-credential
                // responses land here too depending on the branch order below).
                console.error(`[API ✕] ${endpoint}`, {
                    request: args,
                    status: result.error.status,
                    error: result.error.data ?? result.error,
                    requestId,
                });
            } else if (result.error.status === 403) {
                // Forbidden: the session itself is valid (401 is what signals a dead/expired
                // token) — 403 just means this particular user/role isn't allowed to do this
                // particular thing (e.g. a non-admin hitting an admin-only endpoint). Logging the
                // user out here would silently kill a perfectly good session over an authorization
                // check that has nothing to do with authentication. Log it, surface it as a toast
                // so the user isn't left staring at a button that silently did nothing, and let
                // the caller's own error handling (if any) react further — no dispatch(logout()).
                console.error(`[API ✕] ${endpoint}`, {
                    request: args,
                    status: result.error.status,
                    error: result.error.data ?? result.error,
                    requestId,
                });
                api.dispatch(
                    addNotification({
                        type: "error",
                        title: "Доступ заборонено",
                        message: extractErrorMessage(result.error) ?? "У вас немає прав для цієї дії.",
                    })
                );
            } else {
                // Covers other 4xx/5xx (result.error.status is a number) — genuine responses
                // from a reachable backend. Logged individually as before, and now also surfaced
                // as a toast with the backend's own human-readable message when it sent one, so
                // failures are visible in the UI instead of only in the console.
                console.error(`[API ✕] ${endpoint}`, {
                    request: args,
                    status: result.error.status,
                    error: result.error.data ?? result.error,
                    requestId,
                });
                const message = extractErrorMessage(result.error);
                if (message) {
                    api.dispatch(
                        addNotification({
                            type: "error",
                            title: "Помилка",
                            message,
                        })
                    );
                }
            }
        } else if (import.meta.env.DEV) {
            console.log(`[API ←] ${endpoint}`, result.data);
        }

        return result;
    };

    return loggingBaseQuery;
};

/**
 * True when a query failed because the backend is completely unreachable (dev API down,
 * ERR_CONNECTION_REFUSED, CORS preflight failure) rather than a genuine 4xx/5xx response.
 * Used above to throttle the single app-wide "Немає з'єднання" notification.
 */
export const isBackendUnreachable = (error: FetchBaseQueryError | undefined): boolean =>
    !!error && (error.status === "FETCH_ERROR" || error.status === "TIMEOUT_ERROR");
