import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";

// Mirrors OLX.API.Controllers.AdminMessageController (Olx.BLL.DTOs.AdminMessage.AdminMessageDto) —
// the existing admin<->user messaging system, reused here to power the admin dashboard's
// "Чати" widgets with real data instead of a mocked-up chat UI.
export interface IAdminMessageItem {
    id: number;
    userName: string;
    userId: number;
    readed: boolean;
    deleted: boolean;
    messageLogo?: string | null;
    created: string;
    forAdmin: boolean;
    message: {
        id: number;
        content: string;
        subject: string;
    };
}

export interface IAdminMessageSend {
    userId: number;
    subject: string;
    content: string;
}

export const adminMessageService = createApi({
    reducerPath: "adminMessageService",
    baseQuery: createBaseQuery("AdminMessage"),
    tagTypes: ["AdminMessage"],
    endpoints: (builder) => ({
        // Усі повідомлення, адресовані адміністрації (від користувачів).
        getAdminMessages: builder.query<IAdminMessageItem[], void>({
            query: () => "/get/admin",
            providesTags: ["AdminMessage"],
        }),

        sendMessageToUser: builder.mutation<void, IAdminMessageSend>({
            query: (body) => ({
                url: "/send/user",
                method: "PUT",
                body,
            }),
            invalidatesTags: ["AdminMessage"],
        }),

        setMessageRead: builder.mutation<void, number>({
            query: (messageId) => ({
                url: `/readed/set/${messageId}`,
                method: "POST",
            }),
            invalidatesTags: ["AdminMessage"],
        }),
    }),
});

export const {
    useGetAdminMessagesQuery,
    useSendMessageToUserMutation,
    useSetMessageReadMutation,
} = adminMessageService;
