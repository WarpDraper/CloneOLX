import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";
import type {IUserItem} from "../types/account/IUserItem.ts";

import { isTokenExpired } from "../utils/tokenUtils";
import { buildImageUrl, IMAGE_SIZES } from "../utils/buildImageUrl";

// ASP.NET Identity puts role(s) under the long claim URI below; a user with a single role
// decodes it as a plain string, but System.IdentityModel.Tokens.Jwt serializes a user with
// MULTIPLE roles as a JSON array under the same key instead — .Include(...) === 'Admin'
// comparisons against an array silently fail (isAdmin always false), which is why the Admin
// button could disappear even for a real admin account. JwtService now also emits a short
// `role` claim alongside the long-form URI (see JwtService.GetClaimsAsync), so prefer that
// first — but keep every older fallback so a token minted before that change (or a stale
// cached one) still decodes correctly. `roles` is kept as a last-resort alias in case a token
// was ever issued without either standard claim (e.g. crafted manually).
const extractRole = (decoded: any): string => {
    const raw =
        decoded.role ??
        decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ??
        decoded.roles ??
        "";
    if (Array.isArray(raw)) {
        return raw.includes("Admin") ? "Admin" : (raw[0] ?? "");
    }
    return raw;
};

// Same idea as extractRole above, for the user id: JwtService now emits short "id"/"nameid"
// aliases alongside the long-form NameIdentifier claim URI and the JWT-standard "sub". Prefer
// the short claims, but fall back through every form a token (old or new) could carry the id
// in, and always normalize to a number — every consumer of IUserItem.id (favorites, chat,
// admin screens, ownership checks) compares it against numeric ids from the REST API, and a
// stray string "42" !== 42 has previously caused "not yours" false negatives.
const extractUserId = (decoded: any): number | null => {
    const raw =
        decoded.id ??
        decoded.nameid ??
        decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ??
        decoded.sub ??
        null;
    if (raw === null || raw === undefined || raw === "") return null;
    const numeric = Number(raw);
    return Number.isNaN(numeric) ? null : numeric;
};

interface AuthState {
    user: IUserItem | null;
    token: string | null;
    isAuth: boolean;
}

// Every key that could still be carrying identity from a PREVIOUS session. setAuth/logout wipe
// all of these unconditionally, before writing any new state, so a crashed/interrupted auth
// flow (e.g. Google login's popup teardown throwing) can never leave a stale id (like a
// since-deleted user 29) sitting in storage for the next mount to pick up. "auth" is the
// canonical key; the rest are legacy/alternate names this app (or an older build of it) has
// used for the same concept — clearing only "auth" would silently miss any of those.
const IDENTITY_STORAGE_KEYS = ["auth", "user", "userId", "token", "accessToken"];

const purgeStaleIdentityStorage = () => {
    for (const key of IDENTITY_STORAGE_KEYS) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    }
};

const getInitialState = (): AuthState => {
    const savedData = localStorage.getItem("auth");
    if (savedData) {
        const parsed: AuthState = JSON.parse(savedData);
        // A token left over from a previous session (expired, or signed with an old JWT key
        // after a backend restart) must not come back as authenticated — otherwise every
        // guarded query (favorites, SignalR presence hub, ...) fires with a dead token and
        // logs a 401 on first load. See tokenUtils.ts for the full explanation.
        if (parsed.token && isTokenExpired(parsed.token)) {
            localStorage.removeItem("auth");
            return { user: null, token: null, isAuth: false };
        }
        return parsed;
    }
    return { user: null, token: null, isAuth: false };
};

const authSlice = createSlice({
    name: "auth",
    initialState: getInitialState(),
    reducers: {
        setAuth: (state, action: PayloadAction<{ token: string }>) => {
            const { token } = action.payload;

            // Wipe any previous session's identity from storage BEFORE decoding/writing the new
            // one. This is what actually prevents the "stale id 29" bug: if a prior login/logout
            // ever left storage out of sync with Redux (e.g. a crash mid-flow), that stale data
            // is gone before it has any chance to be read again — the only id that can ever end
            // up in state/localStorage from this point on is the one just decoded from THIS
            // token, fresh off the wire.
            purgeStaleIdentityStorage();

            // Декодуємо токен — this is the single source of truth for "who is the current
            // user"; nothing here ever falls back to a previously cached id.
            const decoded: any = jwtDecode(token);

            // decoded.avatarUrl is the bare backend filename (same value as profile.photo
            // elsewhere) — it must be resolved via buildImageUrl (which prefixes it with
            // `${API_BASE_URL}/images/`), not concatenated by hand. Naive concatenation used to
            // produce a malformed URL like `${API_BASE_URL}filename.jpg` (no "/images/" segment,
            // no separating slash), which is why the avatar failed to render in the Header and
            // on the profile pages even though a photo was actually uploaded.
            const fullAvatarUrl = buildImageUrl(decoded.avatarUrl, IMAGE_SIZES.avatarSmall) ?? "";

            const user : IUserItem = {
                id: extractUserId(decoded),
                email: decoded.email || decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"],
                name: decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || decoded.unique_name || "Користувач",
                avatarUrl: fullAvatarUrl,
                location: decoded.city || "",
                phoneNumber: decoded.phoneNumber || "",
                role: extractRole(decoded),
                accountType: decoded.accountType === "Business" ? "Business" : "Individual",
            };

            state.token = token;
            state.user = user;
            state.isAuth = true;

            localStorage.setItem("auth", JSON.stringify(state));
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuth = false;
            purgeStaleIdentityStorage();
        },
        // Clears only the cached user profile piece of state (e.g. a stale/deleted profile
        // behind an otherwise-valid token 404ing on GET /api/User/get/{id}). Deliberately does
        // NOT touch token/isAuth or storage — a 404 on the profile lookup is not proof the
        // session itself is invalid (that's what 401 is for, see createBaseQuery.ts), so this
        // must never force a hard logout/redirect loop.
        clearCachedProfile: (state) => {
            state.user = null;
        },
        updateUser: (state, action: PayloadAction<Partial<IUserItem>>) => {
            if (state.user) {
                // Мержимо старі дані користувача з новими змінами
                state.user = { ...state.user, ...action.payload };

                // Перезаписуємо localStorage, щоб після оновлення сторінки дані не злітали
                localStorage.setItem("auth", JSON.stringify(state));
            }
        }

    },
});

export const { setAuth, logout, updateUser, clearCachedProfile } = authSlice.actions;
export default authSlice.reducer;