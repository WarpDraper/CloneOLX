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

        // Guards against the classic SignalR unmount race: if the component unmounts (route
        // change, React StrictMode's mount->unmount->mount in dev, fast token swap) while
        // `.start()` is still negotiating, calling `.stop()` on it cancels the in-flight
        // negotiation and rejects with `AbortError: The connection was stopped during
        // negotiation.` That's expected/harmless — not a real connection failure — so it must
        // never reach console.error, and the resolved connection must never go on to invoke
        // "Connect" after we've already torn down.
        let cancelled = false;

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
            .then(() => {
                if (cancelled) {
                    // Unmounted while we were still connecting — don't announce "Connect" for a
                    // hub we're about to tear down anyway, just close it.
                    return connection.stop().catch(() => undefined);
                }
                return connection.invoke("Connect").catch(() => undefined);
            })
            .catch((err) => {
                // AbortError here just means the cleanup below cancelled an in-flight
                // negotiation — expected during fast unmount/remount, not a real error.
                if (err?.name !== "AbortError") {
                    console.error("SignalR connection error:", err);
                }
            });

        connectionRef.current = connection;

        return () => {
            cancelled = true;
            connection.invoke("Disconnect").catch(() => undefined);
            // Always catch — stopping a connection mid-negotiation rejects with AbortError,
            // which would otherwise surface as an unhandled promise rejection in the console.
            connection.stop().catch(() => undefined);
            connectionRef.current = null;
        };
    }, [token, dispatch]);

    return connectionRef;
}
