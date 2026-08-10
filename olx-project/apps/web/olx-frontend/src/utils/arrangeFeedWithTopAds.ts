import type { IAdvert } from "../types/advert/IAdvert";

// Regular-advert run length between two premium ("ТОП") slots — alternates 4/5 (rather than a
// fixed 4 or 5) so the premium cadence doesn't look mechanically identical every single cycle.
const MIN_GAP = 4;
const MAX_GAP = 5;

/**
 * Reorders a page of adverts so a premium (`isTop`) advert appears after every 4-5 regular
 * (non-top) ones, instead of wherever they happened to land in API/sort order. Never duplicates
 * or drops an advert — it's a stable reordering of exactly the items passed in.
 *
 * If the page has no top adverts (or only top adverts), the input order is returned unchanged —
 * there is nothing to place. Extra top adverts beyond what the 4-5 cadence needs for this page
 * length are appended, still marked isTop, rather than silently discarded.
 */
export const arrangeFeedWithTopAds = (adverts: IAdvert[]): IAdvert[] => {
    const topAds = adverts.filter((a) => a.isTop);
    const regularAds = adverts.filter((a) => !a.isTop);

    if (topAds.length === 0 || regularAds.length === 0) return adverts;

    const result: IAdvert[] = [];
    let topIndex = 0;
    let gapToggle = 0;

    for (let i = 0; i < regularAds.length; i++) {
        result.push(regularAds[i]);
        const isGapBoundary = (i + 1) % (gapToggle % 2 === 0 ? MIN_GAP : MAX_GAP) === 0;
        if (isGapBoundary && topIndex < topAds.length) {
            result.push(topAds[topIndex]);
            topIndex++;
            gapToggle++;
        }
    }

    // Any top ads left over (more premium items than the cadence had slots for) go at the end,
    // rather than being dropped from the page.
    while (topIndex < topAds.length) {
        result.push(topAds[topIndex]);
        topIndex++;
    }

    return result;
};
