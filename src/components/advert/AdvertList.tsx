import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import AdvertCard from "./AdvertCard";
import AdvertListItem from "./AdvertListItem";
import type { IAdvert } from "../../types/advert/IAdvert";

export type AdvertViewMode = "grid" | "list";

interface AdvertListProps {
    adverts: IAdvert[];
    viewMode: AdvertViewMode;
    onToggleFavorite?: (advert: IAdvert) => void;
    isFavorite?: (advert: IAdvert) => boolean;
    filterNameById?: Map<number, string>;
}

// Column counts mirror the Tailwind classes the grid used before virtualization
// ("grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5") — kept in sync manually since
// react-virtual needs to know row membership ahead of render, not just CSS breakpoints.
const GRID_BREAKPOINTS: Array<[minWidth: number, columns: number]> = [
    [1024, 5], // lg
    [768, 3], // md
    [640, 2], // sm
    [0, 1],
];

const resolveGridColumns = (): number => {
    if (typeof window === "undefined") return 1;
    const width = window.innerWidth;
    return GRID_BREAKPOINTS.find(([minWidth]) => width >= minWidth)?.[1] ?? 1;
};

const useResponsiveColumns = (viewMode: AdvertViewMode): number => {
    const [columns, setColumns] = useState(() => (viewMode === "list" ? 1 : resolveGridColumns()));

    useLayoutEffect(() => {
        if (viewMode === "list") {
            setColumns(1);
            return;
        }
        const onResize = () => setColumns(resolveGridColumns());
        onResize();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [viewMode]);

    return columns;
};

// Frame 234 catalog grid/list — virtualized with @tanstack/react-virtual so only the rows
// actually intersecting the viewport are ever mounted in the DOM. Without this, a 1000+ item
// feed (large "Схожі товари" pools, a raised PAGE_SIZE, admin views, ...) would mount every
// AdvertCard/AdvertListItem at once and tank scroll performance well below 60fps. Uses the
// *window* as the scroll container (useWindowVirtualizer) since the page itself scrolls rather
// than an inner fixed-height div — matches how CategoryListingPage/HomePage already lay things
// out (no overflow-y wrapper around the feed).
const AdvertList: React.FC<AdvertListProps> = ({ adverts, viewMode, onToggleFavorite, isFavorite, filterNameById }) => {
    const columns = useResponsiveColumns(viewMode);
    const containerRef = useRef<HTMLDivElement>(null);

    const rows = useMemo(() => {
        const chunks: IAdvert[][] = [];
        for (let i = 0; i < adverts.length; i += columns) {
            chunks.push(adverts.slice(i, i + columns));
        }
        return chunks;
    }, [adverts, columns]);

    const rowVirtualizer = useWindowVirtualizer({
        count: rows.length,
        // Rough card-height estimate per mode; measureElement (ref below) corrects it per-row
        // after the first paint, so wrapping titles/specs never cause overlap.
        estimateSize: () => (viewMode === "grid" ? 330 : 152),
        overscan: 6,
        gap: 16,
        scrollMargin: containerRef.current?.offsetTop ?? 0,
    });

    const isFavoriteFn = isFavorite ?? (() => false);

    return (
        <div ref={containerRef} className="relative w-full">
            <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative", width: "100%" }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    if (!row) return null;
                    return (
                        <div
                            key={virtualRow.key}
                            data-index={virtualRow.index}
                            ref={rowVirtualizer.measureElement}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
                            }}
                            className={
                                viewMode === "grid"
                                    ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start"
                                    : "flex flex-col gap-3"
                            }
                        >
                            {row.map((advert) =>
                                viewMode === "grid" ? (
                                    <AdvertCard
                                        key={advert.id}
                                        advert={advert}
                                        onToggleFavorite={onToggleFavorite}
                                        isFavorite={isFavoriteFn(advert)}
                                        filterNameById={filterNameById}
                                    />
                                ) : (
                                    <AdvertListItem
                                        key={advert.id}
                                        advert={advert}
                                        onToggleFavorite={onToggleFavorite}
                                        isFavorite={isFavoriteFn(advert)}
                                        filterNameById={filterNameById}
                                    />
                                )
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdvertList;
