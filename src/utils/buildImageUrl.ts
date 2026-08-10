import { APP_ENV } from "../env";

// Бекенд віддає оригінальні файли напряму з /images/{name}.
// ImageService більше не створює WebP-копії та варіанти різних розмірів.
export const IMAGE_SIZES = {
    avatarSmall: 400,
    avatarLarge: 800,
    thumbnail: 800,
    card: 1200,
    gallery: 1200,
} as const;

// Seed fixtures sometimes ship a bare, non-seeded picsum URL ("https://picsum.photos/800/600")
// on every single advert/category — picsum resolves that exact URL to the same photo every
// time, so trusting it as `src` would render one identical image across the entire feed.
// Treat it as "no image" so callers fall through to FallbackImage's per-id prefetch instead.
const GENERIC_PICSUM_URL = /^https:\/\/picsum\.photos\/\d+\/\d+\/?(\?.*)?$/i;

// Unsplash fallback is disabled repo-wide (see unsplashService.ts) — any Unsplash-hosted URL
// that still shows up in stale seed/mock data is treated as "no image" below instead of being
// rendered, so nothing ever dynamically swaps in an online Unsplash photo.
const UNSPLASH_HOST = /(^|\.)unsplash\.com$/i;

// --- Backend image circuit breaker ------------------------------------------------------
// If wwwroot/images is empty (fresh/dev DB, wiped image folder, seeder never ran) every
// single {size}_{name}.webp URL built below is a guaranteed 404 — and every AdvertCard,
// RecommendationCard, avatar, etc. on the page would each fire its own dead GET before
// FallbackImage's onError swaps it out, spamming the network tab. Once enough of those
// requests fail in a row, stop constructing backend image URLs altogether for a while so
// buildImageUrl returns null up front (FallbackImage then skips straight to the Unsplash/SVG
// fallback, no request fired at all) instead of re-discovering the same dead backend one
// broken <img> at a time. A single real success (reportBackendImageSuccess) — e.g. the
// seeder re-runs and files exist again — resets it immediately.
const BACKEND_DOWN_STORAGE_KEY = "backend-images-circuit-open-until";
const BACKEND_DOWN_TTL_MS = 5 * 60 * 1000;
const BACKEND_DOWN_FAILURE_THRESHOLD = 3;
const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

let consecutiveBackendFailures = 0;

const readCircuitOpenUntil = (): number => {
    if (!isBrowser) return 0;
    try {
        return Number(window.localStorage.getItem(BACKEND_DOWN_STORAGE_KEY)) || 0;
    } catch {
        return 0;
    }
};

/** True while the backend image circuit breaker is tripped — callers should skip network entirely. */
export const isBackendImagesCircuitOpen = (): boolean => {
    const until = readCircuitOpenUntil();
    if (until === 0) return false;
    if (Date.now() > until) {
        if (isBrowser) {
            try {
                window.localStorage.removeItem(BACKEND_DOWN_STORAGE_KEY);
            } catch {
                // ignore
            }
        }
        return false;
    }
    return true;
};

/** Call from an <img onError> when a real backend-format URL (not an already-null one) 404s. */
export const reportBackendImageFailure = (): void => {
    consecutiveBackendFailures += 1;
    if (consecutiveBackendFailures < BACKEND_DOWN_FAILURE_THRESHOLD || !isBrowser) return;
    try {
        window.localStorage.setItem(BACKEND_DOWN_STORAGE_KEY, String(Date.now() + BACKEND_DOWN_TTL_MS));
    } catch {
        // Storage unavailable — the in-memory failure count still guards this session's calls.
    }
};

/** Call from an <img onLoad> when a real backend-format URL loads successfully. */
export const reportBackendImageSuccess = (): void => {
    consecutiveBackendFailures = 0;
    if (!isBrowser) return;
    try {
        window.localStorage.removeItem(BACKEND_DOWN_STORAGE_KEY);
    } catch {
        // ignore
    }
};

/** True for URLs this module builds itself (`{API_BASE_URL}/images/{size}_{name}`) — the only
 * ones the circuit breaker above should react to (Unsplash/local-asset URLs fail independently). */
export const isBackendImageUrl = (url: string): boolean => url.startsWith(`${APP_ENV.API_BASE_URL}/images/`);

// Returns true for any Unsplash-hosted URL — used to reject it below instead of rendering it,
// since the Unsplash fallback/integration is completely disabled.
const isUnsplashUrl = (url: string): boolean => {
    try {
        return UNSPLASH_HOST.test(new URL(url).hostname);
    } catch {
        return false;
    }
};

export const buildImageUrl = (name: string | null | undefined, size: number = IMAGE_SIZES.card): string | null => {
    if (!name) return null;
    // Full external URL (Imgur, etc.) — manual seed/mock edits can drop these straight into
    // ImagePaths and they render as-is, no backend prefix involved. Unsplash URLs (and generic,
    // non-unique picsum URLs) are rejected — treated as "no image" so callers (FallbackImage)
    // fall back to their static local placeholder instead of swapping in an online photo.
    if (name.startsWith("http")) return GENERIC_PICSUM_URL.test(name) || isUnsplashUrl(name) ? null : name;
    // Local asset under web/olx-frontend/public — e.g. "/images/mock/chair.jpg". Served
    // directly by Vite/static hosting, so it must NOT be run through the backend's
    // {size}_{name} convention below (that would mangle it into a broken URL).
    if (name.startsWith("/")) return name;
    // Bare DB-seeded filename with no extension can't be a real static asset on the backend
    // (e.g. a stray category/advert title stored in the image column by mistake) — constructing
    // "{API_BASE_URL}/images/{size}_{name}" for it is a guaranteed 404. Skip it so callers
    // (FallbackImage) go straight to the keyword-based Unsplash fallback instead of round-tripping
    // a request that can never succeed.
    if (!/\.[a-z0-9]+$/i.test(name)) return null;
    // Circuit tripped after repeated backend failures — skip another doomed request.
    if (isBackendImagesCircuitOpen()) return null;
    return `${APP_ENV.API_BASE_URL}/images/${name}`;
};
