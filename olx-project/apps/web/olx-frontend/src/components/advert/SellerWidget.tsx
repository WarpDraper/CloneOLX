import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { UserOutlined } from "@ant-design/icons";
import type { ISellerShort } from "../../types/user/ISellerShort";
import { buildImageUrl, IMAGE_SIZES } from "../../utils/buildImageUrl";
import RatingStars from "../common/RatingStars";
import OnlineStatusBadge from "../common/OnlineStatusBadge";
import FallbackImage from "../common/FallbackImage";

interface SellerWidgetProps {
    seller: ISellerShort;
}

const SellerWidget: React.FC<SellerWidgetProps> = ({ seller }) => {
    const { t } = useTranslation();
    const displayName = [seller.firstName, seller.lastName].filter(Boolean).join(" ") || t("sellerWidget.defaultName");
    const avatarUrl = buildImageUrl(seller.photo, IMAGE_SIZES.avatarSmall);

    return (
        <div className="border border-gray-100 rounded-xl p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-mm-purple/40">
            <Link to={`/profile/${seller.id}`} className="flex items-center gap-3 group">
                <div className="w-12 h-12 rounded-full bg-mm-lavender flex items-center justify-center overflow-hidden shrink-0">
                    {/* FallbackImage swaps to a keyword-matched Unsplash photo (never a raw
                        broken <img>) if the backend avatar is missing or 404s — see
                        components/common/FallbackImage.tsx. */}
                    <FallbackImage
                        src={avatarUrl}
                        fallbackKeyword={displayName}
                        uniqueSeed={seller.id}
                        alt={displayName}
                        className="w-full h-full object-cover"
                        placeholder={<UserOutlined className="text-mm-purple text-lg" />}
                    />
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-mm-navy truncate group-hover:underline">{displayName}</p>
                    <RatingStars rating={seller.rating} reviewsCount={seller.reviewsCount} size="sm" />
                </div>
            </Link>
            <div className="mt-3 flex items-center justify-between">
                <OnlineStatusBadge userId={seller.id} isOnline={seller.isOnline} lastSeen={seller.lastSeen} />
                <Link
                    to={`/profile/${seller.id}`}
                    className="text-xs font-semibold text-mm-purple hover:underline"
                >
                    {t("sellerWidget.viewProfile")}
                </Link>
            </div>
        </div>
    );
};

export default SellerWidget;
