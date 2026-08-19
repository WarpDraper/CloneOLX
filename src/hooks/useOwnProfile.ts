import { useEffect } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store";
import { clearCachedProfile } from "../Slice/authSlice";
import { useGetSellerProfileQuery, isOwnProfileId } from "../services/profileService";

/**
 * Wraps useGetSellerProfileQuery(currentUserId) for the CURRENTLY AUTHENTICATED user's own
 * profile (UserProfilePage, SettingsPage).
 *
 * A JWT can be structurally valid and unexpired (isTokenExpired() in tokenUtils.ts says
 * "fine") while still naming a user id that no longer resolves cleanly — the account was
 * deleted server-side, the DB was reset/reseeded, or the user's role/stamp was changed directly
 * in the DB without reissuing a token. GET /api/User/get/{id} can then legitimately 404
 * (UserService.Get, by design — see its comment).
 *
 * IMPORTANT: a 404 here must NEVER force dispatch(logout()) or a redirect. createBaseQuery.ts
 * only treats 401 as "the session itself is dead" — a 404 on this one profile lookup says
 * nothing about whether the token/session is still valid, and forcing a hard logout on it is
 * exactly what produced the "infinite logout loop": logout -> redirect -> re-mount -> same
 * fixed userId query refires -> 404 again -> logout again. Instead, just drop the cached
 * profile piece of state (`state.auth.user`) so stale profile data doesn't linger, and let the
 * caller's own loading/error UI show a normal "couldn't load profile" state. The session
 * (token/isAuth) is left completely untouched.
 */
export function useOwnProfile(userId: number) {
    const dispatch = useDispatch<AppDispatch>();

    const result = useGetSellerProfileQuery(userId, { skip: !isOwnProfileId(userId) });
    const { error } = result;

    useEffect(() => {
        if (error && "status" in error && error.status === 404) {
            dispatch(clearCachedProfile());
        }
    }, [error, dispatch]);

    return result;
}
