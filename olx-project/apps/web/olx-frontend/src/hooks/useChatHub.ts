import { useEffect, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../store";
import { APP_ENV } from "../env";
import { chatService } from "../services/chatService";
import type { IChatMessage } from "../types/chat/IChatMessage";
import type { ISetChatMessageReaded } from "../types/chat/ISetChatMessageReaded";

// Дзеркалить Olx.BLL.Helpers.HubMethods — константи назв SignalR-подій.
const HUB_METHODS = {
    ReceiveChatMessage: "ReceiveChatMessage",
    CreateChat: "CreateChat",
    SetChatMessageReaded: "SetChatMessageReaded",
} as const;

interface UseChatHubOptions {
    onReceiveMessage?: (message: IChatMessage) => void;
    onCreateChat?: (chatId: number) => void;
    onMessagesReaded?: (payload: ISetChatMessageReaded) => void;
}

/**
 * SignalR-з'єднання для сторінки чату (Frame 249).
 * Підключається до {API_BASE_URL}/hub, передає JWT через query-параметр access_token
 * (сервер зчитує його в JwtBearerEvents.OnMessageReceived для шляху "/hub").
 * Підписується на ReceiveChatMessage / CreateChat / SetChatMessageReaded і синхронізує
 * кеш RTK Query (getChatMessages / getChats) без повторного HTTP-запиту.
 */
export function useChatHub({ onReceiveMessage, onCreateChat, onMessagesReaded }: UseChatHubOptions = {}) {
    const token = useSelector((state: RootState) => state.auth.token);
    const dispatch = useDispatch<AppDispatch>();
    const connectionRef = useRef<signalR.HubConnection | null>(null);

    // Актуальні колбеки без потреби перепідключати сокет при кожному рендері.
    const callbacksRef = useRef<UseChatHubOptions>({ onReceiveMessage, onCreateChat, onMessagesReaded });
    callbacksRef.current = { onReceiveMessage, onCreateChat, onMessagesReaded };

    useEffect(() => {
        if (!token) return;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${APP_ENV.API_BASE_URL}/hub`, {
                accessTokenFactory: () => token,
            })
            .withAutomaticReconnect()
            .build();

        connection.on(HUB_METHODS.ReceiveChatMessage, (message: IChatMessage) => {
            dispatch(
                chatService.util.updateQueryData("getChatMessages", message.chatId, (draft) => {
                    if (!draft.some((m) => m.id === message.id)) {
                        draft.push(message);
                    }
                })
            );
            dispatch(chatService.util.invalidateTags(["Chats"]));
            callbacksRef.current.onReceiveMessage?.(message);
        });

        connection.on(HUB_METHODS.CreateChat, (chatId: number) => {
            dispatch(chatService.util.invalidateTags(["Chats"]));
            callbacksRef.current.onCreateChat?.(chatId);
        });

        connection.on(HUB_METHODS.SetChatMessageReaded, (payload: ISetChatMessageReaded) => {
            dispatch(
                chatService.util.updateQueryData("getChatMessages", payload.chatId, (draft) => {
                    draft.forEach((m) => {
                        if (payload.messegesIds?.includes(m.id)) m.readed = true;
                    });
                })
            );
            dispatch(chatService.util.invalidateTags(["Chats"]));
            callbacksRef.current.onMessagesReaded?.(payload);
        });

        connection
            .start()
            .then(() => connection.invoke("Connect").catch(() => undefined))
            .catch((err) => console.error("SignalR connection error:", err));

        connectionRef.current = connection;

        return () => {
            connection.invoke("Disconnect").catch(() => undefined);
            connection.stop();
            connectionRef.current = null;
        };
    }, [token, dispatch]);

    return connectionRef;
}
