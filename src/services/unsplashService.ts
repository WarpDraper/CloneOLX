import { APP_ENV } from "../env";

// Lightweight Unsplash Search helper used as an image fallback when an advert/category
// has no local image (or the local image URL 404s). NOT an RTK Query API slice on purpose —
// this is a best-effort decorative fallback, not app data, so a plain fetch + in-memory
// cache is enough and keeps it out of the redux store.

const UNSPLASH_SEARCH_URL = "https://api.unsplash.com/search/photos";
// Fetch a page of candidates (not just 1) so distinct cards sharing the same keyword
// (e.g. two adverts titled "iPhone 13", or repeated category names) can each be pinned
// to a different photo instead of all resolving to the same top result.
const RESULTS_PER_PAGE = 10;

// cacheKey (query + uniqueSeed) -> resolved photo URL (or null if nothing was found / the lookup failed).
const photoCache = new Map<string, string | null>();
// cacheKey -> in-flight request, so concurrent callers for the same keyword+seed share one fetch.
const inFlight = new Map<string, Promise<string | null>>();

interface UnsplashPhotoResult {
    urls?: {
        thumb?: string;
        small?: string;
        regular?: string;
    };
}

interface UnsplashSearchResponse {
    results?: UnsplashPhotoResult[];
}

// Deterministic djb2-style string hash used to pick a stable-but-distinct result index
// per uniqueSeed, without needing an extra API call per card.
const hashString = (value: string): number => {
    let hash = 5381;
    for (let i = 0; i < value.length; i++) {
        hash = (hash * 33) ^ value.charCodeAt(i);
    }
    return Math.abs(hash);
};

/**
 * Fetches a relevant Unsplash photo URL for a given keyword (item title or category name).
 * Pass `uniqueSeed` (e.g. the advert/category id) so cards sharing the same keyword resolve
 * to different photos from the result set instead of duplicating the same image.
 * Returns null if there's no API key configured, the lookup fails, or nothing matched.
 */
export const getUnsplashPhotoUrl = async (
    keyword: string,
    size: "thumb" | "small" | "regular" = "small",
    uniqueSeed?: string | number,
): Promise<string | null> => {
    const query = keyword?.trim();
    if (!query) return null;

    if (!APP_ENV.UNSPLASH_ACCESS_KEY) {
        console.warn("[unsplashService] VITE_UNSPLASH_ACCESS_KEY is not set — skipping photo fallback.");
        return null;
    }

    const seedKey = uniqueSeed !== undefined && uniqueSeed !== null ? String(uniqueSeed) : "";
    const cacheKey = `${query.toLowerCase()}::${seedKey}`;
    if (photoCache.has(cacheKey)) {
        return photoCache.get(cacheKey) ?? null;
    }

    const pending = inFlight.get(cacheKey);
    if (pending) return pending;

    const request = (async () => {
        try {
            const url = `${UNSPLASH_SEARCH_URL}?query=${encodeURIComponent(query)}&per_page=${RESULTS_PER_PAGE}`;
            const response = await fetch(url, {
                headers: { Authorization: `Client-ID ${APP_ENV.UNSPLASH_ACCESS_KEY}` },
            });

            if (!response.ok) {
                if (response.status === 403) {
                    console.error(`[unsplashService] Rate limit / forbidden (403) for "${query}" (seed: "${seedKey || "none"}") — check VITE_UNSPLASH_ACCESS_KEY and Unsplash rate limits.`);
                } else {
                    console.error(`[unsplashService] Unsplash request failed (${response.status}) for "${query}" (seed: "${seedKey || "none"}").`);
                }
                photoCache.set(cacheKey, null);
                return null;
            }

            const data: UnsplashSearchResponse = await response.json();
            const results = data.results ?? [];

            if (results.length === 0) {
                console.error(`[unsplashService] Unsplash returned an empty payload for "${query}" (seed: "${seedKey || "none"}").`);
                photoCache.set(cacheKey, null);
                return null;
            }

            // Distinct-but-deterministic index per seed so the same card always gets the
            // same photo across re-renders, while different cards spread across results.
            const index = seedKey ? hashString(cacheKey) % results.length : 0;
            const photoUrl = results[index]?.urls?.[size] ?? results[0]?.urls?.[size] ?? null;

            if (!photoUrl) {
                console.error(`[unsplashService] Unsplash result for "${query}" (seed: "${seedKey || "none"}") had no "${size}" URL.`);
            }

            photoCache.set(cacheKey, photoUrl);
            return photoUrl;
        } catch (error) {
            console.error(`[unsplashService] Unsplash lookup errored for "${query}" (seed: "${seedKey || "none"}").`, error);
            photoCache.set(cacheKey, null);
            return null;
        } finally {
            inFlight.delete(cacheKey);
        }
    })();

    inFlight.set(cacheKey, request);
    return request;
};
