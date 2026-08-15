import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";
import type {IUserItem} from "../types/account/IUserItem.ts";

import { isTokenExpired } from "../utils/tokenUtils";
import { buildImageUrl, IMAGE_SIZES } from "../utils/buildImageUrl";

interface AuthState {
    user: IUserItem | null;
    token: string | null;
    isAuth: boolean;
}

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

            // Декодуємо токен
            const decoded: any = jwtDecode(token);

            // decoded.avatarUrl is the bare backend filename (same value as profile.photo
            // elsewhere) — it must be resolved via buildImageUrl (which prefixes it with
            // `${API_BASE_URL}/images/`), not concatenated by hand. Naive concatenation used to
            // produce a malformed URL like `${API_BASE_URL}filename.jpg` (no "/images/" segment,
            // no separating slash), which is why the avatar failed to render in the Header and
            // on the profile pages even though a photo was actually uploaded.
            const fullAvatarUrl = buildImageUrl(decoded.avatarUrl, IMAGE_SIZES.avatarSmall) ?? "";

            const user : IUserItem = {
                id: decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || decoded.id,
                email: decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || decoded.email,
                name: decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || decoded.unique_name || "Користувач",
                avatarUrl: fullAvatarUrl,
                location: decoded.city || "",
                phoneNumber: decoded.phoneNumber || "",
                role: decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || decoded.role || "",
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
            localStorage.removeItem("auth");
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

export const { setAuth, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;