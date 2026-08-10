import React, { useState } from "react";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import type { IAdvert } from "../../types/advert/IAdvert";
import AdvertCard from "./AdvertCard";

interface AdvertCarouselProps {
    title: string;
    adverts: IAdvert[];
    itemsPerPage?: number;
}

// Shared 4-item-per-page slider used by AdvertDetailsPage for both "Також Вас можуть
// зацікавити" and "Товари продавця" — paginates through `adverts` in groups of `itemsPerPage`
// (default 4) via left/right arrow controls instead of one long scroll/grid.
const AdvertCarousel: React.FC<AdvertCarouselProps> = ({ title, adverts, itemsPerPage = 4 }) => {
    const [page, setPage] = useState(0);

    if (adverts.length === 0) return null;

    const totalPages = Math.ceil(adverts.length / itemsPerPage);
    // Clamp in case `adverts` shrank (e.g. seller listings refetch) since the last page change.
    const currentPage = Math.min(page, totalPages - 1);
    const visible = adverts.slice(currentPage * itemsPerPage, currentPage * itemsPerPage + itemsPerPage);
    const canPrev = currentPage > 0;
    const canNext = currentPage < totalPages - 1;

    return (
        <section className="mt-12">
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-mm-navy">{title}</h2>
                {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            aria-label="Попередні товари"
                            disabled={!canPrev}
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-mm-navy hover:bg-mm-lavender transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                            <LeftOutlined />
                        </button>
                        <button
                            type="button"
                            aria-label="Наступні товари"
                            disabled={!canNext}
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-mm-navy hover:bg-mm-lavender transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                            <RightOutlined />
                        </button>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {visible.map((advert) => (
                    <AdvertCard key={advert.id} advert={advert} />
                ))}
            </div>
        </section>
    );
};

export default AdvertCarousel;
