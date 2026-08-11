import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { IAdvertImage } from "../../types/advert/IAdvertImage";
import { buildImageUrl, IMAGE_SIZES } from "../../utils/buildImageUrl";
import FallbackImage from "../common/FallbackImage";

interface AdvertGalleryProps {
    images: IAdvertImage[];
    title: string;
}

const AdvertGallery: React.FC<AdvertGalleryProps> = ({ images, title }) => {
    const { t } = useTranslation();
    const sorted = [...images].sort((a, b) => a.priority - b.priority);
    const [activeIndex, setActiveIndex] = useState(0);
    const active = sorted[activeIndex];

    if (sorted.length === 0) {
        return (
            <div className="aspect-square w-full rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                {t("advertGallery.noPhoto")}
            </div>
        );
    }

    return (
        <div className="flex gap-3">
            <div className="hidden sm:flex flex-col gap-2 overflow-y-auto max-h-[480px] pr-1">
                {sorted.map((img, index) => (
                    <button
                        key={img.id}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        className={`w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                            index === activeIndex ? "border-mm-purple" : "border-gray-200 hover:border-gray-300"
                        }`}
                    >
                        <FallbackImage
                            src={buildImageUrl(img.name, IMAGE_SIZES.thumbnail)}
                            fallbackKeyword={title}
                            uniqueSeed={img.id || `${title}-${index}`}
                            alt={`${title} ${index + 1}`}
                            className="w-full h-full object-cover"
                            placeholder={<div className="w-full h-full bg-gray-100" />}
                        />
                    </button>
                ))}
            </div>
            <div className="flex-1 aspect-square rounded-xl overflow-hidden bg-gray-100">
                <FallbackImage
                    src={buildImageUrl(active.name, IMAGE_SIZES.gallery)}
                    fallbackKeyword={title}
                    uniqueSeed={active.id || `${title}-${activeIndex}`}
                    alt={title}
                    className="w-full h-full object-cover"
                    placeholder={
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">{t("advertGallery.noPhoto")}</div>
                    }
                />
            </div>
        </div>
    );
};

export default AdvertGallery;
