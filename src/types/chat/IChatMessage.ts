import type { IChatUser } from "./IChatUser";

// Дзеркалить Olx.BLL.DTOs.Chat.ChatMessageDto (GET /api/chat/messages/{chatId})
export interface IChatMessage {
    id: number;
    content: string;
    sender: IChatUser;
    chatId: number;
    readed: boolean;
    createdAt: string;
}
