import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";
import type { IUserItem } from "../types/account/IUserItem";
import type { IRegisterUser } from "../types/account/IRegisterUser";
import type { IUserLogin } from "../types/account/IUserLogin.ts";
import type { ILoginResult } from "../types/account/ILoginResult.ts";
import type { IUpdateProfile } from "../types/account/IUpdateProfile.ts";

export const accountService = createApi({
    reducerPath: "accountService",
    baseQuery: createBaseQuery("Account"), // Автоматично робить префікс /api/Account
    endpoints: (builder) => ({

        // 1. РЕЄСТРАЦІЯ: тепер без примусового JSON-заголовка!
        register: builder.mutation<IUserItem, IRegisterUser>({
            query: (body) => {
                return {
                    url: "/register/user",
                    method: "PUT",
                    body: body,
                    // ❌ ВИДАЛЕНО headers: { "Content-Type": "application/json" }
                    // Тепер браузер сам встановить multipart/form-data для FormData
                };
            },
        }),

        // 2. ЛОГІН: тут усе правильно (передаємо звичайний JSON-об'єкт)
        login: builder.mutation<ILoginResult, IUserLogin>({
            query: (body) => {
                return {
                    url: "/login",
                    method: "POST",
                    body: body,
                    headers: { "Content-Type": "application/json" },
                };
            },
        }),

        // 3. ЗАБУЛИ ПАРОЛЬ:
        forgotPassword: builder.mutation<{ message: string }, { email: string }>({
            query: (body) => ({
                url: "/password/forgot",
                method: "POST",
                body,
            }),
        }),

        // 4. СКИДАННЯ ПАРОЛЯ:
        resetPassword: builder.mutation<{ message: string }, { email: string; token: string; newPassword: string }>({
            query: (body) => ({
                url: "/password/reset",
                method: "POST",
                body,
            }),
        }),

        // 5. ОНОВЛЕННЯ ПРОФІЛЮ:
        updateProfile: builder.mutation<void, IUpdateProfile>({
            query: (body) => ({
                url: "/edit/user",
                method: "POST",
                body,
            }),
        }),

        // 6. ЗАВАНТАЖЕННЯ АВАТАРКИ:
        uploadAvatar: builder.mutation<{ url: string }, FormData>({
            query: (formData) => ({
                url: "/edit/user",
                method: "POST",
                body: formData,
            }),
        }),

    }),
});

export const {
    useRegisterMutation,
    useLoginMutation,
    useForgotPasswordMutation,
    useResetPasswordMutation,
    useUpdateProfileMutation,
    useUploadAvatarMutation,
} = accountService;