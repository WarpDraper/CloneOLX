import React from "react";
import { StarFilled, StarOutlined } from "@ant-design/icons";

interface RatingStarsProps {
    rating: number;
    reviewsCount?: number;
    size?: "sm" | "md";
    showCount?: boolean;
}

const RatingStars: React.FC<RatingStarsProps> = ({ rating, reviewsCount = 0, size = "md", showCount = true }) => {
    const rounded = Math.round(rating);
    const starSize = size === "sm" ? "text-xs" : "text-sm";

    return (
        <div className="flex items-center gap-1">
            <div className={`flex items-center gap-0.5 text-mm-orange ${starSize}`}>
                {Array.from({ length: 5 }).map((_, i) =>
                    i < rounded ? <StarFilled key={i} /> : <StarOutlined key={i} className="text-gray-300" />
                )}
            </div>
            <span className="text-sm font-semibold text-mm-navy">{rating.toFixed(1)}</span>
            {showCount && (
                <span className="text-xs text-gray-500">({reviewsCount})</span>
            )}
        </div>
    );
};

export default RatingStars;
