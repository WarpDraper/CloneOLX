import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";

// Mirrors OLX.API.Controllers.NotificationController / Olx.BLL.DTOs.NotificationDtos —
// DB-persisted, per-user notifications (header bell dropdown + /notifications page). Distinct
// from store/notificationSlice.ts, which is an in-memory client-side toast/error queue used by
// createBaseQuery for API-failure banners and is NOT related to this feature.
// Mirrors Olx.BLL.Entities.NotificationType. Raw int on the wire (no JsonStringEnumConverter
// registered on the backend), same pattern as ItemCondition/DeliveryType/PaymentMethod.
export const NotificationType = {
    General: 0,
    Welcome: 1,
    OrderPlaced: 2,
    PasswordChanged: 3,
    NewChat: 4,
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export interface INotification {
    id: number;
    title: string;
    message: string;
    targetUrl?: string | null;
    type: NotificationType;
    isRead: boolean;
    createdAt: string;
}

export interface INotificationPage {
    total: number;
    items: INotification[];
}

export interface ITopUnreadNotifications {
    items: INotification[];
    unreadCount: number;
}

export const notificationService = createApi({
    reducerPath: "notificationService",
    baseQuery: createBaseQuery("Notification"), // префікс /api/Notification
    tagTypes: ["Notifications"],
    endpoints: (builder) => ({

        // GET /api/notification?page=&pageSize= — paginated feed for the /notifications page.
        getNotifications: builder.query<INotificationPage, { page: number; pageSize: number }>({
            query: ({ page, pageSize }) => ({
                url: "",
                params: { page, pageSize },
            }),
            providesTags: ["Notifications"],
        }),

        // GET /api/notification/top-unread?count=3 — header bell dropdown data in one round-trip.
        getTopUnread: builder.query<ITopUnreadNotifications, number | void>({
            query: (count) => ({
                url: "/top-unread",
                params: count ? { count } : undefined,
            }),
            providesTags: ["Notifications"],
        }),

        // PUT /api/notification/{id}/read
        markAsRead: builder.mutation<void, number>({
            query: (id) => ({
                url: `/${id}/read`,
                method: "PUT",
            }),
            invalidatesTags: ["Notifications"],
        }),

        // PUT /api/notification/read-all
        markAllAsRead: builder.mutation<void, void>({
            query: () => ({
                url: "/read-all",
                method: "PUT",
            }),
            invalidatesTags: ["Notifications"],
        }),

    }),
});

export const {
    useGetNotificationsQuery,
    useGetTopUnreadQuery,
    useMarkAsReadMutation,
    useMarkAllAsReadMutation,
} = notificationService;
