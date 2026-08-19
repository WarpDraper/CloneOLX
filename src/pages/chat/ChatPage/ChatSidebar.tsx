import React from "react";
import { Link } from "react-router-dom";
import { Modal, message } from "antd";
import { useTranslation } from "react-i18next";
import {
    UserOutlined,
    PhoneOutlined,
    CalendarOutlined,
    StopOutlined,
    FlagOutlined,
    ExclamationCircleFilled,
} from "@ant-design/icons";
import type { ISellerProfile } from "../../../types/user/ISellerProfile";
import type { ISellerShort } from "../../../types/user/ISellerShort";
import { buildImageUrl, IMAGE_SIZES } from "../../../utils/buildImageUrl";
import ImageWithFallback from "../../../components/common/ImageWithFallback";
import RatingStars from "../../../components/common/RatingStars";
import OnlineStatusBadge from "../../../components/common/OnlineStatusBadge";
import FallbackImage from "../../../components/common/FallbackImage";
import type { ChatWindowAdvert } from "./ChatWindow";

type ChatCounterpart = ISellerProfile | ISellerShort;

interface ChatSidebarProps {
    seller: ChatCounterpart | null;
    advert: ChatWindowAdvert | null;
}

// Права колонка Frame 249 (Screenshot 4): картка співрозмовника — аватар, ім'я, дата
// реєстрації, рейтинг, к-ть оголошень, телефон, посилання на профіль, прив'язане оголошення
// та дії "Заблокувати"/"Поскаржитись". Ані блокування користувачів, ані скарги на користувача
// не мають бекенд-ендпоінтів (лише ReportController для оголошень адмінами) — тому це локальні
// UI-дії з підтвердженням, а не фейковий виклик неіснуючого API.
const ChatSidebar: React.FC<ChatSidebarProps> = ({ seller, advert }) => {
    const { t } = useTranslation();

    if (!seller) {
        return <p className="text-sm text-gray-400 text-center mt-8 px-4">{t('chat.sidebar.emptyState')}</p>;
    }

    const displayName = [seller.firstName, seller.lastName].filter(Boolean).join(" ") || t('chat.sidebar.fallbackUser');
    const avatarUrl = buildImageUrl(seller.photo, IMAGE_SIZES.avatarLarge);
    const advertsCount = "adverts" in seller ? seller.adverts.length : null;
    const regDate = seller.createdDate
        ? new Date(seller.createdDate).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })
        : null;

    const handleBlock = () => {
        Modal.confirm({
            title: t('chat.sidebar.blockConfirmTitle', { name: displayName }),
            icon: <ExclamationCircleFilled className="text-red-500" />,
            content: t('chat.sidebar.blockConfirmContent'),
            okText: t('chat.sidebar.blockConfirmOk'),
            okButtonProps: { danger: true },
            cancelText: t('common.cancel'),
            onOk: () => message.success(t('chat.sidebar.blockSuccess', { name: displayName })),
        });
    };

    const handleReport = () => {
        Modal.confirm({
            title: t('chat.sidebar.reportConfirmTitle', { name: displayName }),
            icon: <ExclamationCircleFilled className="text-red-500" />,
            content: t('chat.sidebar.reportConfirmContent'),
            okText: t('chat.sidebar.reportConfirmOk'),
            okButtonProps: { danger: true },
            cancelText: t('common.cancel'),
            onOk: () => message.success(t('chat.sidebar.reportSuccess')),
        });
    };

    return (
        <div className="flex flex-col gap-4 h-full overflow-y-auto p-4">
            <div className="flex flex-col items-center text-center gap-2 pb-4 border-b border-gray-100">
                <div className="relative aspect-square w-20 h-20 rounded-full bg-mm-lavender flex items-center justify-center overflow-hidden shrink-0">
                    <ImageWithFallback
                        src={avatarUrl}
                        alt={displayName}
                        className="w-full h-full object-cover object-center scale-110"
                        fallback={<UserOutlined className="text-mm-purple text-2xl" />}
                    />
                </div>
                <p className="text-base font-bold text-mm-navy">{displayName}</p>
                <RatingStars rating={seller.rating} reviewsCount={seller.reviewsCount} size="sm" />
                <OnlineStatusBadge userId={seller.id} isOnline={seller.isOnline} lastSeen={seller.lastSeen} />
            </div>

            <div className="flex flex-col gap-2 text-sm text-gray-600 pb-4 border-b border-gray-100">
                {regDate && (
                    <div className="flex items-center gap-2">
                        <CalendarOutlined className="text-gray-400" />
                        <span>{t('chat.sidebar.memberSince', { date: regDate })}</span>
                    </div>
                )}
                {advertsCount !== null && (
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400">📦</span>
                        <span>{t('chat.sidebar.advertsCount', { count: advertsCount })}</span>
                    </div>
                )}
                {seller.phoneNumber && (
                    <div className="flex items-center gap-2">
                        <PhoneOutlined className="text-gray-400" />
                        <span>{seller.phoneNumber}</span>
                    </div>
                )}
            </div>

            <Link
                to={`/profile/${seller.id}`}
                className="w-full text-center bg-mm-lavender hover:bg-purple-100 text-mm-purple font-semibold text-sm py-2 rounded-lg transition-colors"
            >
                {t('chat.sidebar.viewProfile')}
            </Link>

            {advert && (
                <Link
                    to={`/advert/${advert.id}`}
                    className="flex items-center gap-3 border border-gray-100 rounded-lg p-2.5 hover:border-mm-purple transition-colors"
                >
                    <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 shrink-0">
                        <FallbackImage
                            src={advert.imageUrl}
                            alt={advert.title}
                            className="w-full h-full object-cover"
                            placeholder={<div className="w-full h-full bg-gray-100" />}
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-mm-navy truncate">{advert.title}</p>
                        <p className="text-[11px] text-mm-purple font-semibold mt-0.5">{t('chat.sidebar.goToAdvert')}</p>
                    </div>
                </Link>
            )}

            <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-gray-100">
                <button
                    type="button"
                    onClick={handleBlock}
                    className="flex items-center justify-center gap-2 w-full text-sm font-semibold text-gray-500 hover:text-red-500 hover:bg-red-50 py-2 rounded-lg transition-colors"
                >
                    <StopOutlined /> {t('chat.sidebar.blockUser')}
                </button>
                <button
                    type="button"
                    onClick={handleReport}
                    className="flex items-center justify-center gap-2 w-full text-sm font-semibold text-gray-500 hover:text-red-500 hover:bg-red-50 py-2 rounded-lg transition-colors"
                >
                    <FlagOutlined /> {t('chat.sidebar.reportUser')}
                </button>
            </div>
        </div>
    );
};

export default ChatSidebar;
