import React from "react";
import { StarFilled, StarOutlined } from "@ant-design/icons";

interface RatingStarsProps {
    /** Backend DTOs sometimes send this as null/undefined/a numeric string despite the TS
     * type — guard at runtime so a malformed value never crashes SellerWidget/advert pages. */
    rating: number | string | null | undefined;
    reviewsCount?: number;
    size?: "sm" | "md";
    showCount?: boolean;
}

const RatingStars: React.FC<RatingStarsProps> = ({ rating, reviewsCount = 0, size = "md", showCount = true }) => {
    const safeRating = typeof rating === "number" && Number.isFinite(rating) ? rating : Number(rating) || 0;
    const rounded = Math.round(safeRating);
    const starSize = size === "sm" ? "text-xs" : "text-sm";

    return (
        <div className="flex items-center gap-1">
            <div className={`flex items-center gap-0.5 text-mm-orange ${starSize}`}>
                {Array.from({ length: 5 }).map((_, i) =>
                    i < rounded ? <StarFilled key={i} /> : <StarOutlined key={i} className="text-gray-300" />
                )}
            </div>
            <span className="text-sm font-semibold text-mm-navy">{safeRating.toFixed(1)}</span>
            {showCount && (
                <span className="text-xs text-gray-500">({reviewsCount})</span>
            )}
        </div>
    );
};

export default RatingStars;
