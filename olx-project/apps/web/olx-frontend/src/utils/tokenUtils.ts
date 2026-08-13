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
