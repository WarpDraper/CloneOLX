import React from "react";
import { UserOutlined } from "@ant-design/icons";
import { Badge } from "antd";
import type { IChat } from "../../../types/chat/IChat";
import { buildImageUrl, IMAGE_SIZES } from "../../../utils/buildImageUrl";

interface ChatThreadListProps {
    chats: IChat[];
    currentUserId: number;
    selectedChatId: number | null;
    onSelect: (chatId: number) => void;
    isLoading: boolean;
}

// Ліва колонка Frame 249: список тредів чату з лічильниками непрочитаних.
const ChatThreadList: React.FC<ChatThreadListProps> = ({ chats, currentUserId, selectedChatId, onSelect, isLoading }) => {
    const sorted = [...chats].sort((a, b) => {
        const unreadA = a.buyer.id === currentUserId ? a.buyerUnreaded : a.sellerUnreaded;
        const unreadB = b.buyer.id === currentUserId ? b.buyerUnreaded : b.sellerUnreaded;
        if (unreadA !== unreadB) return unreadB - unreadA;
        return new Date(b.createAt).getTime() - new Date(a.createAt).getTime();
    });

    return (
        <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b border-gray-100 shrink-0">
                <h2 className="text-base font-bold text-mm-navy">Чати</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <p className="text-center text-gray-400 text-sm py-8">Завантаження...</p>
                ) : sorted.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-8 px-4">У вас поки немає чатів.</p>
                ) : (
                    sorted.map((chat) => {
                        const isBuyer = chat.buyer.id === currentUserId;
                        const counterpart = isBuyer ? chat.seller : chat.buyer;
                        const unread = isBuyer ? chat.buyerUnreaded : chat.sellerUnreaded;
                        const avatarUrl = buildImageUrl(counterpart.photo, IMAGE_SIZES.avatarSmall);
                        const active = chat.id === selectedChatId;

                        return (
                            <button
                                key={chat.id}
                                type="button"
                                onClick={() => onSelect(chat.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-50 transition-colors ${
                                    active ? "bg-mm-lavender" : "hover:bg-gray-50"
                                }`}
                            >
                                <div className="w-10 h-10 rounded-full bg-mm-lavender flex items-center justify-center overflow-hidden shrink-0">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={counterpart.description} className="w-full h-full object-cover" />
                                    ) : (
                                        <UserOutlined className="text-mm-purple" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={`text-sm truncate ${unread > 0 ? "font-bold text-mm-navy" : "font-semibold text-mm-navy"}`}>
                                        {counterpart.description}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">{chat.advert.title}</p>
                                </div>
                                {unread > 0 && <Badge count={unread} color="#7b3fe4" />}
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ChatThreadList;
