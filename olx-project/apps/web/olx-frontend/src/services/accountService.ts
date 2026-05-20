import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";
import type { IUserItem } from "../types/account/IUserItem";
import type { IRegisterUser } from "../types/account/IRegisterUser";
import type {IUserLogin} from "../types/account/IUserLogin.ts";
import type {ILoginResult} from "../types/account/ILoginResult.ts";

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
    }),
});

// Експортуємо обидва хуки
export const { useRegisterMutation, useLoginMutation } = accountService;