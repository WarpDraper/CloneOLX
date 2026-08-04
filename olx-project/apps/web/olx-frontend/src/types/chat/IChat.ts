import type { IChatUser } from "./IChatUser";
import type { IShortAdvert } from "../advert/IShortAdvert";

// Дзеркалить Olx.BLL.DTOs.Chat.ChatDto (GET /api/chat/chats)
export interface IChat {
    id: number;
    buyer: IChatUser;
    seller: IChatUser;
    advert: IShortAdvert;
    sellerUnreaded: number;
    buyerUnreaded: number;
    createAt: string;
}
