import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";
import { useGetChatsQuery, useGetChatMessagesQuery, useSendMessageMutation, useCreateChatMutation, useSetReadedMutation } from "../../../services/chatService";
import { useGetAdvertByIdQuery, useGetAdvertsByRangeMutation } from "../../../services/advertService";
import { useGetSellerProfileQuery } from "../../../services/profileService";
import { useChatHub } from "../../../hooks/useChatHub";
import { buildImageUrl, IMAGE_SIZES } from "../../../utils/buildImageUrl";
import SellerWidget from "../../../components/advert/SellerWidget";
import ChatThreadList from "./ChatThreadList";
import ChatWindow, { type ChatWindowAdvert } from "./ChatWindow";

// Frame 249: сторінка чату в реальному часі. Три колонки — треди, активна переписка, картка продавця.
// Підтримує ?advertId=... (розпочати чат щодо конкретного оголошення) та ?sellerId=... (написати продавцю,
// із вибором одного з його активних оголошень, якщо чат ще не існує — POST /api/chat/create вимагає AdvertId).
const ChatPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { isAuth, user } = useSelector((state: RootState) => state.auth);
    const currentUserId = Number(user?.id);

    useEffect(() => {
        if (!isAuth) navigate("/login", { replace: true });
    }, [isAuth, navigate]);

    const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
    const [pendingAdvertId, setPendingAdvertId] = useState<number | null>(null);
    const [pendingSellerId, setPendingSellerId] = useState<number | null>(null);

    const { data: chats = [], isLoading: isChatsLoading } = useGetChatsQuery(undefined, { skip: !isAuth });

    // Підключення до SignalR-хабу /hub, кеш RTK Query оновлюється автоматично в useChatHub.
    useChatHub({});

    // Розв'язуємо ?advertId= / ?sellerId= у вже існуючий чат, або переходимо в режим "новий чат".
    useEffect(() => {
        const advertIdParam = searchParams.get("advertId");
        const sellerIdParam = searchParams.get("sellerId");

        if (advertIdParam) {
            const aId = Number(advertIdParam);
            const existing = chats.find((c) => c.advert.id === aId);
            if (existing) {
                setSelectedChatId(existing.id);
                setPendingAdvertId(null);
                setPendingSellerId(null);
                return;
            }
            if (selectedChatId === null) {
                setPendingAdvertId(aId);
                setPendingSellerId(null);
            }
            return;
        }

        if (sellerIdParam) {
            const sId = Number(sellerIdParam);
            const existing = chats.find((c) => c.buyer.id === sId || c.seller.id === sId);
            if (existing) {
                setSelectedChatId(existing.id);
                setPendingSellerId(null);
                setPendingAdvertId(null);
                return;
            }
            if (selectedChatId === null && pendingAdvertId === null) {
                setPendingSellerId(sId);
            }
            return;
        }

        if (selectedChatId === null && pendingAdvertId === null && pendingSellerId === null && chats.length > 0) {
            setSelectedChatId(chats[0].id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chats, searchParams]);

    const selectedChat = useMemo(() => chats.find((c) => c.id === selectedChatId) ?? null, [chats, selectedChatId]);

    const { data: messages = [], isLoading: isMessagesLoading } = useGetChatMessagesQuery(selectedChatId!, { skip: !selectedChatId });
    const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
    const [createChat, { isLoading: isCreating }] = useCreateChatMutation();
    const [setReaded] = useSetReadedMutation();

    // Оголошення для режиму "новий чат" (ще немає ChatDto, тож немає ShortAdvertDto).
    const { data: pendingAdvert } = useGetAdvertByIdQuery(pendingAdvertId!, { skip: !pendingAdvertId });

    // Автоматично позначаємо вхідні повідомлення прочитаними, поки чат відкрито.
    useEffect(() => {
        if (!selectedChatId || !currentUserId) return;
        const unreadIds = messages.filter((m) => !m.readed && m.sender.id !== currentUserId).map((m) => m.id);
        if (unreadIds.length > 0) {
            setReaded({ ids: unreadIds, chatId: selectedChatId });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedChatId, messages]);

    const handleSelectThread = (chatId: number) => {
        setSelectedChatId(chatId);
        setPendingAdvertId(null);
        setPendingSellerId(null);
        if (searchParams.toString()) setSearchParams({}, { replace: true });
    };

    const handleSend = async (message: string) => {
        if (selectedChat) {
            await sendMessage({ chatId: selectedChat.id, message }).unwrap();
        } else if (pendingAdvertId) {
            await createChat({ advertId: pendingAdvertId, message }).unwrap();
        }
    };

    const handlePickSellerAdvert = (advertId: number) => {
        setSearchParams({ advertId: String(advertId) }, { replace: true });
    };

    // ---- Дані для правої колонки (картка продавця) ----
    // Хуки викликаються завжди безумовно (Rules of Hooks); вимикаємо запит через skip, коли даних ще немає.
    const counterpartId = selectedChat
        ? selectedChat.buyer.id === currentUserId
            ? selectedChat.seller.id
            : selectedChat.buyer.id
        : null;
    const { data: counterpartProfile } = useGetSellerProfileQuery(counterpartId ?? 0, { skip: !counterpartId });

    const counterpartSeller = selectedChat
        ? counterpartProfile ?? null
        : pendingAdvertId && pendingAdvert?.user
        ? pendingAdvert.user
        : null;

    const { data: sellerPickerProfile } = useGetSellerProfileQuery(pendingSellerId!, { skip: !pendingSellerId });
    const [getAdvertsByRange, { data: sellerAdverts, isLoading: isSellerAdvertsLoading }] = useGetAdvertsByRangeMutation();
    useEffect(() => {
        if (sellerPickerProfile && sellerPickerProfile.adverts.length > 0) {
            getAdvertsByRange(sellerPickerProfile.adverts);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sellerPickerProfile]);
    const activeSellerAdverts = (sellerAdverts ?? []).filter((a) => a.approved && !a.blocked && !a.completed);

    const windowAdvert: ChatWindowAdvert | null = selectedChat
        ? {
              id: selectedChat.advert.id,
              title: selectedChat.advert.title,
              price: selectedChat.advert.price,
              imageUrl: buildImageUrl(selectedChat.advert.image, IMAGE_SIZES.thumbnail),
          }
        : pendingAdvert
        ? {
              id: pendingAdvert.id,
              title: pendingAdvert.title,
              price: pendingAdvert.price,
              imageUrl: buildImageUrl([...pendingAdvert.images].sort((a, b) => a.priority - b.priority)[0]?.name, IMAGE_SIZES.thumbnail),
          }
        : null;

    if (!isAuth) return null;

    return (
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-6">
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-[280px_1fr_300px] h-[calc(100vh-160px)] min-h-[560px]">
                <div className="border-r border-gray-100 hidden md:flex flex-col overflow-hidden">
                    <ChatThreadList
                        chats={chats}
                        currentUserId={currentUserId}
                        selectedChatId={selectedChatId}
                        onSelect={handleSelectThread}
                        isLoading={isChatsLoading}
                    />
                </div>

                <div className="flex flex-col overflow-hidden">
                    {pendingSellerId && !windowAdvert ? (
                        <div className="flex-1 overflow-y-auto p-4">
                            <h3 className="text-sm font-bold text-mm-navy mb-3">
                                Виберіть оголошення, щоб написати {sellerPickerProfile ? [sellerPickerProfile.firstName, sellerPickerProfile.lastName].filter(Boolean).join(" ") || "продавцю" : "продавцю"}
                            </h3>
                            {isSellerAdvertsLoading ? (
                                <p className="text-sm text-gray-400">Завантаження оголошень...</p>
                            ) : activeSellerAdverts.length === 0 ? (
                                <p className="text-sm text-gray-400">У продавця немає активних оголошень.</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {activeSellerAdverts.map((advert) => {
                                        const cover = [...advert.images].sort((a, b) => a.priority - b.priority)[0];
                                        const imageUrl = buildImageUrl(cover?.name, IMAGE_SIZES.thumbnail);
                                        return (
                                            <button
                                                key={advert.id}
                                                type="button"
                                                onClick={() => handlePickSellerAdvert(advert.id)}
                                                className="flex items-center gap-3 border border-gray-100 rounded-lg p-2 hover:border-mm-purple transition-colors text-left"
                                            >
                                                <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 shrink-0">
                                                    {imageUrl && <img src={imageUrl} alt={advert.title} className="w-full h-full object-cover" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-mm-navy truncate">{advert.title}</p>
                                                    <p className="text-xs text-gray-500">{advert.isContractPrice ? "Договірна" : `${advert.price.toLocaleString("uk-UA")} грн.`}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <ChatWindow
                            advert={windowAdvert}
                            messages={selectedChat ? messages : []}
                            currentUserId={currentUserId}
                            onSend={handleSend}
                            isSending={isSending || isCreating}
                            isPending={!selectedChat && !!pendingAdvertId}
                            isLoading={!!selectedChat && isMessagesLoading}
                        />
                    )}
                </div>

                <div className="border-l border-gray-100 hidden lg:block p-4 overflow-y-auto">
                    {counterpartSeller ? (
                        <SellerWidget seller={counterpartSeller} />
                    ) : (
                        <p className="text-sm text-gray-400 text-center mt-8">Дані продавця з'являться після вибору чату</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
