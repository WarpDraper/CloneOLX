import { fetchBaseQuery } from "@reduxjs/toolkit/query/react"; // краще імпортувати з /react
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { APP_ENV } from "../env";
import type { RootState } from "../store";
import { addNotification } from "../store/notificationSlice";
import { logout } from "../Slice/authSlice";

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

export const createBaseQuery = (endpoint: string) => {
    const rawBaseQuery = fetchBaseQuery({
        baseUrl: `${APP_ENV.API_BASE_URL}/api/${endpoint}`,
        // The refresh token lives in an HttpOnly cookie set by the API (different origin/port
        // than the Vite dev server), so every request must opt in to sending/receiving cookies —
        // without this, login/refresh silently drop the cookie and the API's CORS
        // AllowCredentials() policy has nothing to match against.
        credentials: 'include',
        prepareHeaders: (headers, { getState }) => {
            const token = (getState() as RootState).auth.token;

            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }
            return headers;
        },
    });

    const loggingBaseQuery: typeof rawBaseQuery = async (args, api, extraOptions) => {
        if (import.meta.env.DEV) {
            console.log(`[API →] ${endpoint}`, args);
        }

        const result = await rawBaseQuery(args, api, extraOptions);

        if (result.error) {
            // Single clear, formatted line for every failed request, in every environment (not
            // just DEV) — "no silent failures" means this must be visible in the prod console
            // too, not just logged as part of the richer per-branch context objects below.
            // `args` is either a bare url string or a FetchArgs object ({ url, method, ... }),
            // so the request path has to be read out of whichever shape it is.
            const requestUrl = typeof args === "string" ? args : args.url;
            console.error(`[API ERROR ${result.error.status}] ${requestUrl}:`, {
                status: result.error.status,
                data: result.error.data,
                endpoint: requestUrl,
            });

            if (isBackendUnreachable(result.error)) {
                // Single throttled notification + console line for the whole app, not one per
                // failed request — see cooldown note above.
                const now = Date.now();
                if (now - lastUnreachableNoticeAt > UNREACHABLE_NOTICE_COOLDOWN_MS) {
                    lastUnreachableNoticeAt = now;
                    console.error(`[API ✕] Backend unreachable`, { endpoint, request: args, status: result.error.status });
                    api.dispatch(
                        addNotification({
                            type: "error",
                            title: "Немає з'єднання",
                            message: "Бекенд не відповідає",
                        })
                    );
                }
            } else if (result.error.status === 401) {
                // Expired/invalid token: the backend will keep rejecting every guarded request
                // (chats, favorites, ...) with 401 until the user re-authenticates, so retrying
                // or letting each `*Service.ts` slice keep firing is pointless and just spams the
                // console. Log once, then force a logout — this clears the dead token/user from
                // the store (and localStorage, see authSlice), which flips every
                // `skip: !isAuth` / `skip: !token` guard across the app so those queries stop
                // re-firing instead of looping on 401 forever.
                console.error(`[API ✕] ${endpoint}`, {
                    request: args,
                    status: result.error.status,
                    error: result.error.data ?? result.error,
                });
                const state = api.getState() as RootState;
                if (state.auth.isAuth || state.auth.token) {
                    api.dispatch(logout());
                }
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
 * *Service.ts callers use this (alongside an empty-result check) to decide when to fall back
 * to local seed data hydration (see utils/seedHydration.ts) instead of showing an error state.
 */
export const isBackendUnreachable = (error: FetchBaseQueryError | undefined): boolean =>
    !!error && (error.status === "FETCH_ERROR" || error.status === "TIMEOUT_ERROR");
