import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";
import type { IUserItem } from "../types/account/IUserItem";
import type { IRegisterUser } from "../types/account/IRegisterUser";
import type {IUserLogin} from "../types/account/IUserLogin.ts";
import type {ILoginResult} from "../types/account/ILoginResult.ts";
import type {IUpdateProfile} from "../types/account/IUpdateProfile.ts";

export const accountService = createApi({
    reducerPath: "accountService",
    baseQuery: createBaseQuery("Authorize"),
    endpoints: (builder) => ({
        register: builder.mutation<IUserItem, IRegisterUser>({
            query: (body) => {
                return {
                    url: "/regist",
                    method: "POST",
                    body: body,
                    headers: { "Content-Type": "application/json" },
                };
            },
        }),
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
        forgotPassword: builder.mutation<{ message: string }, { email: string }>({
            query: (body) => ({
                url: "/forgot-password",
                method: "POST",
                body,
            }),
        }),
        resetPassword: builder.mutation<{ message: string }, { email: string; token: string; newPassword: string }>({
            query: (body) => ({
                url: "/reset-password",
                method: "POST",
                body,
            }),
        }),
        uploadAvatar: builder.mutation<{ url: string }, FormData>({
            query: (formData) => ({
                url: "/update-avatar",
                method: "POST",
                body: formData,
            }),
        }),
        updateProfile: builder.mutation<void, IUpdateProfile>({
            query: (body) => ({
                url: "/update-profile", 
                method: "PUT",
                body,
            }),
        })

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