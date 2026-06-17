import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";

export const reportService = createApi({
    reducerPath: "reportService",
    baseQuery: createBaseQuery("Report"),
    tagTypes: ['Report'],
    endpoints: (builder) => ({
        getReports: builder.query<any, void>({
            query: () => ({
                url: '/pending',
                method: 'GET'
            }),
            providesTags: ['Report'],
        }),

        resolveReport: builder.mutation<void, { reportId: number | string; status: string }>({
            query: (dto) => ({
                url: '/resolve',
                method: 'POST',
                body: dto,
            }),
            invalidatesTags: ['Report'],
        }),
    }),
});

export const {
    useGetReportsQuery,
    useResolveReportMutation,
} = reportService;