import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, ZoomIn, X } from "lucide-react";
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
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const active = sorted[activeIndex];
    const hasMultiple = sorted.length > 1;

    // Circular navigation — wraps around instead of disabling the arrow at either end, matching
    // OLX's own gallery (Home/End keys aside, there's no "dead" arrow state to design for).
    const goPrev = useCallback(() => {
        setActiveIndex((i) => (i - 1 + sorted.length) % sorted.length);
    }, [sorted.length]);

    const goNext = useCallback(() => {
        setActiveIndex((i) => (i + 1) % sorted.length);
    }, [sorted.length]);

    // Keyboard navigation while the lightbox is open — ArrowLeft/ArrowRight to switch photos,
    // Escape to close. Only bound while the modal is mounted so it never steals arrow keys from
    // the rest of the page (e.g. quantity steppers) during normal browsing.
    useEffect(() => {
        if (!isLightboxOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsLightboxOpen(false);
            else if (e.key === "ArrowLeft") goPrev();
            else if (e.key === "ArrowRight") goNext();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isLightboxOpen, goPrev, goNext]);

    if (sorted.length === 0) {
        return (
            <div className="relative w-full h-[400px] sm:h-[480px] bg-gray-50 flex items-center justify-center rounded-2xl overflow-hidden text-gray-400">
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
                        className={`relative w-16 h-16 aspect-square rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                            index === activeIndex ? "border-mm-purple" : "border-gray-200 hover:border-gray-300"
                        }`}
                    >
                        <FallbackImage
                            src={buildImageUrl(img.name, IMAGE_SIZES.thumbnail)}
                            fallbackKeyword={title}
                            uniqueSeed={img.id || `${title}-${index}`}
                            alt={`${title} ${index + 1}`}
                            className="w-full h-full object-cover object-center scale-110"
                            placeholder={<div className="w-full h-full bg-gray-100" />}
                        />
                    </button>
                ))}
            </div>
            {/* Seamless surface: no more letterboxing bg-black/bg-neutral-950 frame around the
                photo — object-contain keeps non-square product photos uncropped, and any
                remaining empty space just blends into the page/card background instead of
                reading as a dark "viewer" box. */}
            <div className="relative flex-1 w-full h-[400px] sm:h-[480px] bg-transparent flex items-center justify-center rounded-2xl overflow-hidden group">
                <FallbackImage
                    src={buildImageUrl(active.name, IMAGE_SIZES.gallery)}
                    fallbackKeyword={title}
                    uniqueSeed={active.id || `${title}-${activeIndex}`}
                    alt={title}
                    className="object-contain max-h-[500px] w-full mx-auto"
                    placeholder={
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">{t("advertGallery.noPhoto")}</div>
                    }
                />

                {hasMultiple && (
                    <>
                        <button
                            type="button"
                            onClick={goPrev}
                            aria-label={t("advertGallery.prev")}
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white p-2 rounded-full transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            type="button"
                            onClick={goNext}
                            aria-label={t("advertGallery.next")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white p-2 rounded-full transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </>
                )}

                <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    aria-label={t("adverts.details.fullscreen")}
                    title={t("adverts.details.fullscreen")}
                    className="absolute bottom-3 right-3 bg-black/50 hover:bg-black/75 text-white p-2 rounded-full transition-all"
                >
                    <ZoomIn size={18} />
                </button>
            </div>

            {isLightboxOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setIsLightboxOpen(false)}
                >
                    <div
                        className="relative max-w-3xl max-h-[85vh] w-full bg-neutral-900/95 rounded-2xl p-4 shadow-2xl flex flex-col items-center justify-center overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setIsLightboxOpen(false)}
                            aria-label={t("advertGallery.close")}
                            className="absolute top-4 right-4 bg-black/50 hover:bg-black/75 text-white p-2 rounded-full transition-all"
                        >
                            <X size={24} />
                        </button>

                        {hasMultiple && (
                            <>
                                <button
                                    type="button"
                                    onClick={goPrev}
                                    aria-label={t("advertGallery.prev")}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white p-3 rounded-full transition-all"
                                >
                                    <ChevronLeft size={28} />
                                </button>
                                <button
                                    type="button"
                                    onClick={goNext}
                                    aria-label={t("advertGallery.next")}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white p-3 rounded-full transition-all"
                                >
                                    <ChevronRight size={28} />
                                </button>
                            </>
                        )}

                        <FallbackImage
                            src={buildImageUrl(active.name, IMAGE_SIZES.gallery)}
                            fallbackKeyword={title}
                            uniqueSeed={active.id || `${title}-${activeIndex}`}
                            alt={title}
                            className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg select-none"
                            placeholder={
                                <div className="text-gray-400 text-sm">{t("advertGallery.noPhoto")}</div>
                            }
                        />

                        {hasMultiple && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-xs font-medium">
                                {activeIndex + 1} / {sorted.length}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvertGallery;
