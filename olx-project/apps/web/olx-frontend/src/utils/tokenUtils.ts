import { jwtDecode } from "jwt-decode";

/**
 * True when `token` is missing, malformed, or past its `exp` claim.
 *
 * Root cause for the 401 noise this guards against: authSlice persists `{ token, isAuth }` to
 * localStorage and just trusts it back on the next page load (see getInitialState). If the
 * backend's JWT signing key changes (new appsettings, DB reset, ...) or the access token simply
 * expires, `isAuth` stays `true` with a token the API will now reject on *every* request — so
 * usePresenceHub still opens a SignalR connection (401 on /hub/negotiate) and every
 * `skip: !isAuth` RTK Query call (favorites, etc.) still fires, each logging a 401 to the
 * console. Treating an expired/invalid token as "no token" fixes this at the source.
 */
export const isTokenExpired = (token: string | null | undefined): boolean => {
    if (!token) return true;

    try {
        const decoded = jwtDecode<{ exp?: number }>(token);
        if (!decoded.exp) return false; // no exp claim — can't tell, assume valid
        return decoded.exp * 1000 <= Date.now();
    } catch {
        return true; // unparseable token is as good as absent
    }
};

/** True when `token` is present and not expired. */
export const isTokenValid = (token: string | null | undefined): boolean => !isTokenExpired(token);

/**
 * Reads the access token straight out of localStorage, bypassing Redux state entirely.
 * authSlice persists the whole `{ user, token, isAuth }` shape under a single "auth" key (see
 * authSlice.getInitialState) — there is no bare "token" key. Used as a fallback wherever a
 * request could fire before the Redux store has caught up with a token that was *just* written
 * to storage (prepareHeaders on the first authenticated request right after login/refresh, or a
 * component's query mounting before the store's re-render lands) — exactly the race that used
 * to send a request with no Authorization header, get a spurious 401 back, and trip the global
 * logout even though the session was actually fine.
 */
export const getStoredToken = (): string | null => {
    try {
        const raw = localStorage.getItem("auth");
        if (!raw) return null;
        // authSlice.setAuth always normalizes to `token` before persisting (see authSlice.ts),
        // but `accessToken` is checked too in case this ever reads a payload/state shape that
        // forwarded the backend's raw AuthResponse (`{ accessToken, refreshToken }` — the actual
        // shape POST /login and /login/google return, see ILoginResult) without normalizing it
        // first.
        const parsed = JSON.parse(raw) as { token?: string | null; accessToken?: string | null };
        return parsed.token ?? parsed.accessToken ?? null;
    } catch {
        return null;
    }
};
