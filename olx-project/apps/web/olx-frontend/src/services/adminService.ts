import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";
import type { IUserItem } from "../types/account/IUserItem";

export const adminService = createApi({
    reducerPath: "adminService",
    baseQuery: createBaseQuery("Admin"),
    tagTypes: ['User', 'Report'],
    endpoints: (builder) => ({
        getUsers: builder.query<IUserItem[], void>({
            query: () => ({
                url: "/users",
                method: "GET",
            }),
            providesTags: ['User'],
        }),

        toggleUserBlock: builder.mutation<void, number | string>({
            query: (id) => ({
                url: `/users/${id}/toggle-block`,
                method: 'POST',
            }),
            invalidatesTags: ['User'],
        }),


    }),
});

export const {
    useGetUsersQuery,
    useToggleUserBlockMutation,
} = adminService;