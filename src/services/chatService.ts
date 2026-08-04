import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";
import type { IChat } from "../types/chat/IChat";
import type { IChatMessage } from "../types/chat/IChatMessage";

interface CreateChatRequest {
    advertId: number;
    message?: string;
}

interface SendMessageRequest {
    chatId: number;
    message: string;
}

interface SetReadedRequest {
    ids: number[];
    chatId: number;
}

export const chatService = createApi({
    reducerPath: "chatService",
    baseQuery: createBaseQuery("Chat"), // префікс /api/Chat
    tagTypes: ["Chats", "Messages"],
    endpoints: (builder) => ({

        // 1. СПИСОК ЧАТІВ КОРИСТУВАЧА: GET /api/chat/chats?advertId=... — потребує авторизації.
        getChats: builder.query<IChat[], number | void>({
            query: (advertId) => ({
                url: "/chats",
                params: advertId ? { advertId } : undefined,
            }),
            providesTags: ["Chats"],
        }),

        // 2. ІСТОРІЯ ПОВІДОМЛЕНЬ ЧАТУ: GET /api/chat/messages/{chatId}.
        getChatMessages: builder.query<IChatMessage[], number>({
            query: (chatId) => `/messages/${chatId}`,
            providesTags: (_result, _error, chatId) => [{ type: "Messages", id: chatId }],
        }),

        // 3. НАДІСЛАТИ ПОВІДОМЛЕННЯ В ІСНУЮЧИЙ ЧАТ: POST /api/chat/send.
        sendMessage: builder.mutation<void, SendMessageRequest>({
            query: (body) => ({
                url: "/send",
                method: "POST",
                body,
            }),
            invalidatesTags: (_result, _error, { chatId }) => [{ type: "Messages", id: chatId }, "Chats"],
        }),

        // 4. СТВОРИТИ ЧАТ (за оголошенням, опційно з першим повідомленням): PUT /api/chat/create.
        createChat: builder.mutation<void, CreateChatRequest>({
            query: (body) => ({
                url: "/create",
                method: "PUT",
                body,
            }),
            invalidatesTags: ["Chats"],
        }),

        // 5. ПОЗНАЧИТИ ПОВІДОМЛЕННЯ ПРОЧИТАНИМИ: POST /api/chat/set/readed.
        setReaded: builder.mutation<void, SetReadedRequest>({
            query: (body) => ({
                url: "/set/readed",
                method: "POST",
                body,
            }),
            invalidatesTags: (_result, _error, { chatId }) => [{ type: "Messages", id: chatId }, "Chats"],
        }),

        // 6. ВИДАЛИТИ ЧАТ ДЛЯ ПОТОЧНОГО КОРИСТУВАЧА: DELETE /api/chat/user/delete/{chatId}.
        removeChatForUser: builder.mutation<void, number>({
            query: (chatId) => ({
                url: `/user/delete/${chatId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Chats"],
        }),

    }),
});

export const {
    useGetChatsQuery,
    useGetChatMessagesQuery,
    useSendMessageMutation,
    useCreateChatMutation,
    useSetReadedMutation,
    useRemoveChatForUserMutation,
} = chatService;
