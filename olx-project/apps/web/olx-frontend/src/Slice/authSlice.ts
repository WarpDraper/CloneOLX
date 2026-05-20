import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";
import type {IUserItem} from "../types/account/IUserItem.ts";


interface AuthState {
    user: IUserItem | null; // Тут будуть дані з токена
    token: string | null;
    isAuth: boolean;
}

const getInitialState = (): AuthState => {
    const savedData = localStorage.getItem("auth");
    if (savedData) {
        return JSON.parse(savedData);
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

            const user : IUserItem = {
                id: decoded.id,
                email: decoded.email,
                name: decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || decoded.unique_name,
                avatar: decoded.avatar,
                location: decoded.location,
                phoneNumber: decoded.phoneNumber,
                role: decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
                    decoded.role || ""
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
    },
});

export const { setAuth, logout } = authSlice.actions;
export default authSlice.reducer;