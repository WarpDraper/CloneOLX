import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ILoginResult} from "../types/account/ILoginResult.ts";

interface AuthState {
    user: ILoginResult | null;
    token: string | null;
    isAuth: boolean;
}

// Функція для отримання початкового стану з localStorage
const getInitialState = (): AuthState => {
    const savedData = localStorage.getItem("auth");
    if (savedData) {
        const parsed = JSON.parse(savedData);
        return {
            user: parsed.user,
            token: parsed.token,
            isAuth: true,
        };
    }
    return { user: null, token: null, isAuth: false };
};

const authSlice = createSlice({
    name: "auth",
    initialState: getInitialState(),
    reducers: {
        setAuth: (state, action: PayloadAction<{ token: string; email: string }>) => {

            state.token = action.payload.token;
            state.user = { email: action.payload.email } as any;
            state.isAuth = true;

            localStorage.setItem("auth", JSON.stringify({
                user: state.user,
                token: state.token
            }));
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuth = false;
            // Видаляємо з LocalStorage
            localStorage.removeItem("auth");
        },
    },
});

export const { setAuth, logout } = authSlice.actions;
export default authSlice.reducer;