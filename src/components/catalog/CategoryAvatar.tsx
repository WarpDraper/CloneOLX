import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppstoreOutlined } from "@ant-design/icons";
import type { ICategory } from "../../types/category/ICategory";
import { buildImageUrl, IMAGE_SIZES } from "../../utils/buildImageUrl";
import { getCategoryName } from "../../utils/getCategoryName";
import FallbackImage from "../common/FallbackImage";

interface CategoryAvatarProps {
    category: ICategory;
    /** Circle diameter in px. Defaults to the Frame 126 / 330 spec (72px). */
    size?: number;
    onClick?: () => void;
    className?: string;
}

// Circular category avatar per Figma Frame 126 (Home page category rail) / Frame 330
// (mega-menu visual strip): dark navy/purple ring, image or icon inside the circle,
// title centered below.
const CategoryAvatar: React.FC<CategoryAvatarProps> = ({ category, size = 72, onClick, className = "" }) => {
    const { i18n } = useTranslation();
    const displayName = getCategoryName(category, i18n.language);

    // categories.seed.json now ships an explicit, content-matching photo for every top-level
    // category and major subcategory (see src/data/seed/categories.seed.json). FallbackImage
    // renders `src` as-is whenever it's present and only ever reaches for the Unsplash
    // keyword fallback (still keyed off this category's own name, not a random photo) if
    // there's no explicit image or it fails to load.
    const localSrc = buildImageUrl(category.image, IMAGE_SIZES.thumbnail);

    return (
        <Link
            to={`/category/${category.id}`}
            onClick={onClick}
            className={`flex flex-col items-center gap-2.5 shrink-0 group transition-transform duration-300 hover:-translate-y-1 ${className}`}
        >
            <div
                style={{ width: size, height: size }}
                className="relative aspect-square rounded-full overflow-hidden shrink-0 bg-mm-navy border-2 border-mm-purple/40 group-hover:border-mm-orange shadow-sm group-hover:shadow-lg flex items-center justify-center transition-all duration-300"
            >
                <FallbackImage
                    src={localSrc}
                    fallbackKeyword={displayName}
                    uniqueSeed={category.id || category.name}
                    alt={displayName}
                    className="w-full h-full object-cover object-center scale-125 transition-transform duration-300"
                    placeholder={<AppstoreOutlined className="text-2xl text-white/80" />}
                />
            </div>
            <span className="text-xs font-medium text-gray-700 text-center leading-tight group-hover:text-mm-purple transition-colors max-w-[90px]">
                {displayName}
            </span>
        </Link>
    );
};

export default CategoryAvatar;
