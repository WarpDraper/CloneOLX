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

        // 1. РЕЄСТРАЦІЯ: у Swagger це PUT /api/Account/register/user
        register: builder.mutation<IUserItem, IRegisterUser>({
            query: (body) => {
                return {
                    url: "/register/user", // було /regist/user
                    method: "PUT",         // було POST
                    body: body,
                    headers: { "Content-Type": "application/json" },
                };
            },
        }),

        // 2. ЛОГІН: у Swagger це POST /api/Account/login (тут усе правильно)
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

        // 3. ЗАБУЛИ ПАРОЛЬ: у Swagger це POST /api/Account/password/forgot
        forgotPassword: builder.mutation<{ message: string }, { email: string }>({
            query: (body) => ({
                url: "/password/forgot", // було /forgot-password
                method: "POST",
                body,
            }),
        }),

        // 4. СКИДАННЯ ПАРОЛЯ: у Swagger це POST /api/Account/password/reset
        resetPassword: builder.mutation<{ message: string }, { email: string; token: string; newPassword: string }>({
            query: (body) => ({
                url: "/password/reset", // було /reset-password
                method: "POST",
                body,
            }),
        }),

        // 5. ОНОВЛЕННЯ ПРОФІЛЮ: у Swagger це POST /api/Account/edit/user
        updateProfile: builder.mutation<void, IUpdateProfile>({
            query: (body) => ({
                url: "/edit/user", // було /update-profile
                method: "POST",    // було PUT
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