import React, { useState } from "react";
import type { IAdvertImage } from "../../types/advert/IAdvertImage";
import { buildImageUrl, IMAGE_SIZES } from "../../utils/buildImageUrl";

interface AdvertGalleryProps {
    images: IAdvertImage[];
    title: string;
}

const AdvertGallery: React.FC<AdvertGalleryProps> = ({ images, title }) => {
    const sorted = [...images].sort((a, b) => a.priority - b.priority);
    const [activeIndex, setActiveIndex] = useState(0);
    const active = sorted[activeIndex];

    if (sorted.length === 0) {
        return (
            <div className="aspect-square w-full rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                Немає фото
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
                        <img
                            src={buildImageUrl(img.name, IMAGE_SIZES.thumbnail) ?? undefined}
                            alt={`${title} ${index + 1}`}
                            className="w-full h-full object-cover"
                        />
                    </button>
                ))}
            </div>
            <div className="flex-1 aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img
                    src={buildImageUrl(active.name, IMAGE_SIZES.gallery) ?? undefined}
                    alt={title}
                    className="w-full h-full object-cover"
                />
            </div>
        </div>
    );
};

export default AdvertGallery;
