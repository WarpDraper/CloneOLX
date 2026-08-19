import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";

// Mirrors Olx.BLL.DTOs.ReportDtos.ReportDto (GET /api/Report/pending).
export interface IReportItem {
    id: number;
    reporterId: number;
    reporterName: string;
    reporterEmail: string;
    targetType: "advert" | "user";
    targetId: number;
    targetLabel: string;
    reason: string;
    description: string | null;
    status: "Pending" | "Resolved" | "Rejected";
    createdAt: string;
}

// Mirrors Olx.BLL.Models.Report.ReportCreationModel (POST /api/Report body) — exactly one of
// advertId / targetUserId is expected.
export interface IReportCreateRequest {
    advertId?: number;
    targetUserId?: number;
    reason: string;
    description?: string;
}

// Mirrors Olx.BLL.Models.Report.ReportResolutionModel (PUT /{id}/resolve|reject body).
export interface IReportResolutionRequest {
    banUser?: boolean;
    unpublishAdvert?: boolean;
}

export const reportService = createApi({
    reducerPath: "reportService",
    baseQuery: createBaseQuery("Report"),
    tagTypes: ["Report"],
    endpoints: (builder) => ({
        getPendingReports: builder.query<IReportItem[], void>({
            query: () => ({
                url: "/pending",
                method: "GET",
            }),
            providesTags: ["Report"],
        }),

        createReport: builder.mutation<IReportItem, IReportCreateRequest>({
            query: (dto) => ({
                url: "",
                method: "POST",
                body: dto,
            }),
        }),

        resolveReport: builder.mutation<void, { id: number | string } & IReportResolutionRequest>({
            query: ({ id, ...body }) => ({
                url: `/${id}/resolve`,
                method: "PUT",
                body,
            }),
            invalidatesTags: ["Report"],
        }),

        rejectReport: builder.mutation<void, { id: number | string } & IReportResolutionRequest>({
            query: ({ id, ...body }) => ({
                url: `/${id}/reject`,
                method: "PUT",
                body,
            }),
            invalidatesTags: ["Report"],
        }),
    }),
});

export const {
    useGetPendingReportsQuery,
    useCreateReportMutation,
    useResolveReportMutation,
    useRejectReportMutation,
} = reportService;
