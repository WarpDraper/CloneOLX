import React from "react";
import { Link } from "react-router-dom";
import { UserOutlined } from "@ant-design/icons";
import type { ISellerShort } from "../../types/user/ISellerShort";
import { buildImageUrl, IMAGE_SIZES } from "../../utils/buildImageUrl";
import RatingStars from "../common/RatingStars";
import OnlineStatusBadge from "../common/OnlineStatusBadge";

interface SellerWidgetProps {
    seller: ISellerShort;
}

const SellerWidget: React.FC<SellerWidgetProps> = ({ seller }) => {
    const displayName = [seller.firstName, seller.lastName].filter(Boolean).join(" ") || "Продавець";
    const avatarUrl = buildImageUrl(seller.photo, IMAGE_SIZES.avatarSmall);

    return (
        <div className="border border-gray-100 rounded-xl p-4">
            <Link to={`/profile/${seller.id}`} className="flex items-center gap-3 group">
                <div className="w-12 h-12 rounded-full bg-mm-lavender flex items-center justify-center overflow-hidden shrink-0">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                        <UserOutlined className="text-mm-purple text-lg" />
                    )}
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-mm-navy truncate group-hover:underline">{displayName}</p>
                    <RatingStars rating={seller.rating} reviewsCount={seller.reviewsCount} size="sm" />
                </div>
            </Link>
            <div className="mt-3 flex items-center justify-between">
                <OnlineStatusBadge lastActivity={seller.lastActivity} />
                <Link
                    to={`/profile/${seller.id}`}
                    className="text-xs font-semibold text-mm-purple hover:underline"
                >
                    Переглянути профіль
                </Link>
            </div>
        </div>
    );
};

export default SellerWidget;
