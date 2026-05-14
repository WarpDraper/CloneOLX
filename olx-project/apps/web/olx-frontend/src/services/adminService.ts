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

        getReports: builder.query<any, void>({
            query: () => '/reports',
            providesTags: ['Report'],
        }),

        updateReportStatus: builder.mutation<void, { id: number | string; status: string }>({
            query: ({ id, status }) => ({
                url: `/reports/${id}/status`,
                method: 'PUT',
                body: { status },
            }),
            invalidatesTags: ['Report'],
        }),
    }),
});

export const {
    useGetUsersQuery,
    useToggleUserBlockMutation,
    useGetReportsQuery,
    useUpdateReportStatusMutation
} = adminService;