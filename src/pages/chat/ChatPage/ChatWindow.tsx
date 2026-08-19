import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import {
    SendOutlined,
    CheckOutlined,
    CheckCircleOutlined,
    PaperClipOutlined,
    PictureOutlined,
    InfoCircleOutlined,
} from "@ant-design/icons";
import type { IChatMessage } from "../../../types/chat/IChatMessage";
import OnlineStatusBadge from "../../../components/common/OnlineStatusBadge";
import FallbackImage from "../../../components/common/FallbackImage";

export interface ChatWindowAdvert {
    id: number;
    title: string;
    price: number;
    imageUrl: string | null;
}

export interface ChatWindowCounterpart {
    id: number;
    isOnline?: boolean;
    lastSeen?: string | null;
}

interface ChatWindowProps {
    advert: ChatWindowAdvert | null;
    counterpart: ChatWindowCounterpart | null;
    messages: IChatMessage[];
    currentUserId: number;
    onSend: (text: string) => void;
    isSending: boolean;
    isPending: boolean; // true = чат ще не створено, показуємо лише оголошення + перше повідомлення
    isLoading: boolean;
    infoOpen: boolean;
    onToggleInfo: () => void;
}

// Групує повідомлення за календарним днем ("Сьогодні"/"Вчора"/дата) для роздільників у стрічці.
const formatDayLabel = (iso: string, t: (key: string) => string): string => {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

    if (sameDay(date, today)) return t('chat.window.today');
    if (sameDay(date, yesterday)) return t('chat.window.yesterday');
    return date.toLocaleDateString("uk-UA", {
        day: "numeric",
        month: "long",
        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
};

// Центральна колонка Frame 249 (Screenshot 4): статус співрозмовника + "Показати інформацію",
// закріплена картка оголошення, стрічка повідомлень із роздільниками дат (фіолетові бульбашки —
// свої, сірі — співрозмовника, з часом і індикатором прочитання), композер із кнопками
// вкладення/фото (бекенд ще не підтримує зображення в чаті — див. IChatMessage — тож вони
// показані, але навмисно неактивні з підказкою, а не фейкова функціональність) і кнопкою надсилання.
const ChatWindow: React.FC<ChatWindowProps> = ({
    advert,
    counterpart,
    messages,
    currentUserId,
    onSend,
    isSending,
    isPending,
    isLoading,
    infoOpen,
    onToggleInfo,
}) => {
    const { t } = useTranslation();
    const [text, setText] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // block: "nearest" keeps this scroll contained to the messages list's own
        // `overflow-y-auto` container. Without it, scrollIntoView's default ("start") walks up
        // every scrollable ancestor — including the outer page — and was yanking the whole page
        // down to the chat window every time a message was sent/received.
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
                {t('chat.window.selectChatPrompt')}
            </div>
        );
    }

    let lastDateKey: string | null = null;

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0 bg-white">
                {counterpart ? (
                    <OnlineStatusBadge userId={counterpart.id} isOnline={counterpart.isOnline} lastSeen={counterpart.lastSeen} />
                ) : (
                    <span />
                )}
                <button
                    type="button"
                    onClick={onToggleInfo}
                    aria-pressed={infoOpen}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                        infoOpen ? "bg-mm-lavender text-mm-purple" : "text-gray-500 hover:bg-gray-100"
                    }`}
                >
                    <InfoCircleOutlined /> {t('chat.window.toggleInfo')}
                </button>
            </div>

            <Link
                to={`/advert/${advert.id}`}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors shrink-0"
            >
                <div className="relative w-11 h-11 aspect-square overflow-hidden rounded-lg bg-gray-100 shrink-0">
                    <FallbackImage
                        src={advert.imageUrl}
                        alt={advert.title}
                        className="w-full h-full object-cover object-center scale-110"
                        placeholder={<div className="w-full h-full" />}
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-mm-navy truncate">{advert.title}</p>
                    <p className="text-xs text-gray-500">{advert.price ? t('chat.common.priceValue', { price: advert.price.toLocaleString("uk-UA") }) : t('chat.common.negotiablePrice')}</p>
                </div>
            </Link>

            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 bg-[#faf9fc]">
                {isLoading ? (
                    <p className="text-center text-gray-400 text-sm py-8">{t('chat.window.loadingMessages')}</p>
                ) : isPending && messages.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-8">
                        {t('chat.window.firstMessagePrompt')}
                    </p>
                ) : (
                    messages.map((message) => {
                        const isOwn = message.sender.id === currentUserId;
                        const dateKey = new Date(message.createdAt).toDateString();
                        const showDivider = dateKey !== lastDateKey;
                        lastDateKey = dateKey;

                        return (
                            <React.Fragment key={message.id}>
                                {showDivider && (
                                    <div className="flex items-center justify-center my-2">
                                        <span className="text-[11px] font-medium text-gray-400 bg-gray-100 rounded-full px-3 py-1">
                                            {formatDayLabel(message.createdAt, t)}
                                        </span>
                                    </div>
                                )}
                                <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
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
                            </React.Fragment>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 shrink-0">
                <Tooltip title={t('chat.window.attachmentsSoon')}>
                    <button
                        type="button"
                        disabled
                        aria-label={t('chat.window.addFile')}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 opacity-50 cursor-not-allowed shrink-0"
                    >
                        <PaperClipOutlined />
                    </button>
                </Tooltip>
                <Tooltip title={t('chat.window.photosSoon')}>
                    <button
                        type="button"
                        disabled
                        aria-label={t('chat.window.addPhoto')}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 opacity-50 cursor-not-allowed shrink-0"
                    >
                        <PictureOutlined />
                    </button>
                </Tooltip>
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleSend();
                    }}
                    placeholder={t('chat.window.messagePlaceholder')}
                    className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-mm-purple"
                />
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={!text.trim() || isSending}
                    aria-label={t('chat.window.send')}
                    className="w-10 h-10 rounded-full bg-mm-purple hover:bg-mm-purple-dark disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shrink-0"
                >
                    <SendOutlined />
                </button>
            </div>
        </div>
    );
};

export default ChatWindow;
