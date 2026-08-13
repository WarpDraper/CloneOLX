import React, { useMemo, useState } from "react";
import { UserOutlined, SearchOutlined, LeftOutlined, RightOutlined, StarFilled, StarOutlined } from "@ant-design/icons";
import { Badge } from "antd";
import { useTranslation } from "react-i18next";
import type { IChat } from "../../../types/chat/IChat";
import { buildImageUrl, IMAGE_SIZES } from "../../../utils/buildImageUrl";
import FallbackImage from "../../../components/common/FallbackImage";
import { useLiveOnlineStatus } from "../../../hooks/useLiveOnlineStatus";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";

interface ChatThreadListProps {
    chats: IChat[];
    currentUserId: number;
    selectedChatId: number | null;
    onSelect: (chatId: number) => void;
    isLoading: boolean;
}

type FilterTab = "all" | "unread" | "important";

const PAGE_SIZE = 8;
const STARRED_STORAGE_KEY = "chat-starred-ids";

const loadStarred = (): Set<number> => {
    try {
        const raw = localStorage.getItem(STARRED_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
        return new Set();
    }
};

// Small live presence dot for a thread's avatar — mirrors OnlineStatusBadge's logic but as a
// compact corner dot instead of a text label (list items don't have room for "Онлайн"/"Був...").
const PresenceDot: React.FC<{ userId: number }> = ({ userId }) => {
    const { isOnline } = useLiveOnlineStatus(userId, false, null);
    return (
        <span
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                isOnline ? "bg-green-500" : "bg-gray-300"
            }`}
        />
    );
};

// Ліва колонка Frame 249 (Screenshot 4): пошук, вкладки-фільтри, список тредів з аватарами,
// статус-беджами, часом останнього повідомлення та пагінацією знизу.
const ChatThreadList: React.FC<ChatThreadListProps> = ({ chats, currentUserId, selectedChatId, onSelect, isLoading }) => {
    const { t } = useTranslation();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search, 250);
    const [activeTab, setActiveTab] = useState<FilterTab>("all");
    const [page, setPage] = useState(1);
    const [starred, setStarred] = useState<Set<number>>(() => loadStarred());

    const toggleStarred = (chatId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setStarred((prev) => {
            const next = new Set(prev);
            if (next.has(chatId)) next.delete(chatId);
            else next.add(chatId);
            try {
                localStorage.setItem(STARRED_STORAGE_KEY, JSON.stringify([...next]));
            } catch {
                // storage unavailable — in-memory state still works for this session
            }
            return next;
        });
    };

    const sorted = useMemo(
        () =>
            [...chats].sort((a, b) => {
                const unreadA = a.buyer.id === currentUserId ? a.buyerUnreaded : a.sellerUnreaded;
                const unreadB = b.buyer.id === currentUserId ? b.buyerUnreaded : b.sellerUnreaded;
                if (unreadA !== unreadB) return unreadB - unreadA;
                return new Date(b.createAt).getTime() - new Date(a.createAt).getTime();
            }),
        [chats, currentUserId]
    );

    const filtered = useMemo(() => {
        const query = debouncedSearch.trim().toLowerCase();
        return sorted.filter((chat) => {
            const isBuyer = chat.buyer.id === currentUserId;
            const counterpart = isBuyer ? chat.seller : chat.buyer;
            const unread = isBuyer ? chat.buyerUnreaded : chat.sellerUnreaded;

            if (activeTab === "unread" && unread <= 0) return false;
            if (activeTab === "important" && !starred.has(chat.id)) return false;

            if (!query) return true;
            return (
                counterpart.description.toLowerCase().includes(query) ||
                chat.advert.title.toLowerCase().includes(query)
            );
        });
    }, [sorted, debouncedSearch, activeTab, starred, currentUserId]);

    // Reset to page 1 whenever the visible set changes shape (new search/filter). Adjusted
    // during render (React's recommended "derived state" pattern — see FallbackImage.tsx's
    // srcForState for the same technique already used elsewhere in this codebase) instead of
    // an effect, so the user never lands on a now-empty trailing page and we avoid the extra
    // commit/render pass a setState-in-effect would cost.
    const [filterKeyForState, setFilterKeyForState] = useState(`${debouncedSearch}|${activeTab}`);
    const filterKey = `${debouncedSearch}|${activeTab}`;
    if (filterKey !== filterKeyForState) {
        setFilterKeyForState(filterKey);
        setPage(1);
    }

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const clampedPage = Math.min(page, pageCount);
    const pageItems = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

    const TABS: { key: FilterTab; label: string }[] = [
        { key: "all", label: t('chat.threadList.tabs.all') },
        { key: "unread", label: t('chat.threadList.tabs.unread') },
        { key: "important", label: t('chat.threadList.tabs.important') },
    ];

    return (
        <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b border-gray-100 shrink-0 flex flex-col gap-3">
                <h2 className="text-base font-bold text-mm-navy">{t('header.nav.chats')}</h2>
                <div className="relative">
                    <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('chat.threadList.searchPlaceholder')}
                        className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none focus:border-mm-purple"
                    />
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-2.5 py-1 rounded-full transition-colors ${
                                activeTab === tab.key ? "bg-mm-purple text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <p className="text-center text-gray-400 text-sm py-8">{t('common.loading')}</p>
                ) : pageItems.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-8 px-4">
                        {chats.length === 0 ? t('chat.threadList.emptyState') : t('chat.threadList.noResults')}
                    </p>
                ) : (
                    pageItems.map((chat) => {
                        const isBuyer = chat.buyer.id === currentUserId;
                        const counterpart = isBuyer ? chat.seller : chat.buyer;
                        const unread = isBuyer ? chat.buyerUnreaded : chat.sellerUnreaded;
                        const avatarUrl = buildImageUrl(counterpart.photo, IMAGE_SIZES.avatarSmall);
                        const active = chat.id === selectedChatId;
                        const isStarred = starred.has(chat.id);

                        return (
                            <button
                                key={chat.id}
                                type="button"
                                onClick={() => onSelect(chat.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-50 transition-colors ${
                                    active ? "bg-mm-lavender" : "hover:bg-gray-50"
                                }`}
                            >
                                <div className="relative w-10 h-10 rounded-full bg-mm-lavender flex items-center justify-center overflow-hidden shrink-0">
                                    <FallbackImage
                                        src={avatarUrl}
                                        fallbackKeyword={counterpart.description}
                                        uniqueSeed={counterpart.id}
                                        alt={counterpart.description}
                                        className="w-full h-full object-cover"
                                        placeholder={<UserOutlined className="text-mm-purple" />}
                                    />
                                    <PresenceDot userId={counterpart.id} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className={`text-sm truncate ${unread > 0 ? "font-bold text-mm-navy" : "font-semibold text-mm-navy"}`}>
                                            {counterpart.description}
                                        </p>
                                        <span className="text-[10px] text-gray-400 shrink-0">
                                            {new Date(chat.createAt).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">{chat.advert.title}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <span
                                        role="button"
                                        aria-label={isStarred ? t('chat.threadList.unstarAria') : t('chat.threadList.starAria')}
                                        onClick={(e) => toggleStarred(chat.id, e)}
                                        className="text-xs text-mm-orange hover:scale-110 transition-transform cursor-pointer"
                                    >
                                        {isStarred ? <StarFilled /> : <StarOutlined className="text-gray-300" />}
                                    </span>
                                    {unread > 0 && <Badge count={unread} color="#7b3fe4" />}
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            {filtered.length > PAGE_SIZE && (
                <div className="flex items-center justify-center gap-3 px-4 py-2.5 border-t border-gray-100 shrink-0">
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={clampedPage <= 1}
                        aria-label={t('chat.threadList.prevPage')}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <LeftOutlined className="text-xs" />
                    </button>
                    <span className="text-xs text-gray-500 font-medium">
                        {clampedPage} / {pageCount}
                    </span>
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                        disabled={clampedPage >= pageCount}
                        aria-label={t('chat.threadList.nextPage')}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <RightOutlined className="text-xs" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ChatThreadList;
