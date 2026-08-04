import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SendOutlined, CheckOutlined, CheckCircleOutlined } from "@ant-design/icons";
import type { IChatMessage } from "../../../types/chat/IChatMessage";

export interface ChatWindowAdvert {
    id: number;
    title: string;
    price: number;
    imageUrl: string | null;
}

interface ChatWindowProps {
    advert: ChatWindowAdvert | null;
    messages: IChatMessage[];
    currentUserId: number;
    onSend: (text: string) => void;
    isSending: boolean;
    isPending: boolean; // true = чат ще не створено, показуємо лише оголошення + перше повідомлення
    isLoading: boolean;
}

// Центральна колонка Frame 249: закріплена картка оголошення ("image attachment" — чат завжди
// прив'язаний до конкретного Advert, ChatMessageDto не має власного поля для зображень)
// + історія повідомлень (фіолетові бульбашки — свої, сірі — співрозмовника) + композер.
const ChatWindow: React.FC<ChatWindowProps> = ({ advert, messages, currentUserId, onSend, isSending, isPending, isLoading }) => {
    const [text, setText] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    const handleSend = () => {
        const trimmed = text.trim();
        if (!trimmed || isSending) return;
        onSend(trimmed);
        setText("");
    };

    if (!advert) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                Виберіть чат зі списку зліва
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <Link
                to={`/advert/${advert.id}`}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors shrink-0"
            >
                <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {advert.imageUrl ? (
                        <img src={advert.imageUrl} alt={advert.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full" />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-mm-navy truncate">{advert.title}</p>
                    <p className="text-xs text-gray-500">{advert.price ? `${advert.price.toLocaleString("uk-UA")} грн.` : "Договірна"}</p>
                </div>
            </Link>

            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 bg-[#faf9fc]">
                {isLoading ? (
                    <p className="text-center text-gray-400 text-sm py-8">Завантаження повідомлень...</p>
                ) : isPending && messages.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-8">
                        Напишіть перше повідомлення, щоб почати розмову про це оголошення.
                    </p>
                ) : (
                    messages.map((message) => {
                        const isOwn = message.sender.id === currentUserId;
                        return (
                            <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[70%] px-3.5 py-2 text-sm ${
                                        isOwn
                                            ? "bg-mm-purple text-white rounded-2xl rounded-br-sm"
                                            : "bg-gray-100 text-mm-navy rounded-2xl rounded-bl-sm"
                                    }`}
                                >
                                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                    <div className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end text-purple-200" : "justify-start text-gray-400"}`}>
                                        <span className="text-[10px]">
                                            {new Date(message.createdAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                        {isOwn && (message.readed ? <CheckCircleOutlined className="text-[10px]" /> : <CheckOutlined className="text-[10px]" />)}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 shrink-0">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleSend();
                    }}
                    placeholder="Напишіть повідомлення..."
                    className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-mm-purple"
                />
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={!text.trim() || isSending}
                    aria-label="Надіслати"
                    className="w-10 h-10 rounded-full bg-mm-purple hover:bg-mm-purple-dark disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shrink-0"
                >
                    <SendOutlined />
                </button>
            </div>
        </div>
    );
};

export default ChatWindow;
