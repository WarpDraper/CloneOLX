import { store } from "../store";
import { categoryService } from "./categoryService";
import { advertService } from "./advertService";

// Progressive background image prefetcher. Walks every advert/category id the app becomes
// aware of (via the Redux/RTK Query cache, populated by normal navigation) and warms a
// picsum.photos image for each one off the render path — idle-scheduled, never blocking the
// main UI thread. Resolved URLs are cached in localStorage (+ an in-memory mirror) so
// FallbackImage can serve them instantly on next mount instead of waiting on a network call.

const CACHE_PREFIX = "img-prefetch-cache:";
const IMAGE_WIDTH = 800;
const IMAGE_HEIGHT = 600;
const MAX_CONCURRENT_FETCHES = 3;

type PrefetchListener = (url: string) => void;

const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const CACHE_VERSION = "2";
const CACHE_VERSION_KEY = "img-prefetch-cache-version";

// One-time migration: earlier seed fixtures shipped one non-unique picsum URL on every
// advert/category, so any localStorage entries cached before that was fixed (see
// buildImageUrl's generic-picsum guard) could still be pointing every id at the same photo.
// Wipe the whole prefetch cache once per deploy so everything re-resolves its own distinct
// image; bump CACHE_VERSION again if a similar poisoning bug ever needs another purge.
const purgeStaleCache = (): void => {
    if (!isBrowser) return;
    try {
        if (window.localStorage.getItem(CACHE_VERSION_KEY) === CACHE_VERSION) return;
        const staleKeys: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && key.startsWith(CACHE_PREFIX)) staleKeys.push(key);
        }
        staleKeys.forEach((key) => window.localStorage.removeItem(key));
        window.localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
    } catch {
        // Storage unavailable — nothing to purge, the in-memory cache starts empty anyway.
    }
};

purgeStaleCache();

const memoryCache = new Map<string, string>();
const listeners = new Map<string, Set<PrefetchListener>>();
const inFlight = new Map<string, Promise<string>>();
const queue: string[] = [];
const queued = new Set<string>();
const seenStateIds = new Set<string>();
let activeFetches = 0;

const buildPicsumUrl = (id: string): string =>
    `https://picsum.photos/seed/${encodeURIComponent(id)}/${IMAGE_WIDTH}/${IMAGE_HEIGHT}`;

const readFromLocalStorage = (id: string): string | null => {
    if (!isBrowser) return null;
    try {
        return window.localStorage.getItem(`${CACHE_PREFIX}${id}`);
    } catch {
        return null;
    }
};

const writeToLocalStorage = (id: string, url: string): void => {
    if (!isBrowser) return;
    try {
        window.localStorage.setItem(`${CACHE_PREFIX}${id}`, url);
    } catch {
        // Storage full/unavailable (private browsing, quota) — memory cache still covers this session.
    }
};

/** Synchronous cache read so FallbackImage can serve an already-warmed image with zero flicker. */
export const getCachedPrefetchedImage = (id: string | number): string | null => {
    const key = String(id);
    if (memoryCache.has(key)) return memoryCache.get(key) ?? null;

    const stored = readFromLocalStorage(key);
    if (stored) {
        memoryCache.set(key, stored);
        return stored;
    }
    return null;
};

/** Registers `callback` to fire once when `id`'s image resolves. Returns an unsubscribe fn. */
export const subscribeToPrefetch = (id: string | number, callback: PrefetchListener): (() => void) => {
    const key = String(id);
    let set = listeners.get(key);
    if (!set) {
        set = new Set();
        listeners.set(key, set);
    }
    set.add(callback);

    return () => {
        set?.delete(callback);
        if (set && set.size === 0) listeners.delete(key);
    };
};

const notify = (key: string, url: string): void => {
    listeners.get(key)?.forEach((callback) => callback(url));
    listeners.delete(key);
};

const scheduleIdle = (fn: () => void): void => {
    if (isBrowser && typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(() => fn(), { timeout: 2000 });
    } else {
        setTimeout(fn, 0);
    }
};

// Reserves a queue slot synchronously (so the throttle actually throttles, even though the
// real work is deferred to an idle callback), then releases it once that id settles —
// whether it resolved from cache or via a real fetch.
const processQueue = (): void => {
    while (activeFetches < MAX_CONCURRENT_FETCHES && queue.length > 0) {
        const key = queue.shift();
        if (!key) continue;
        queued.delete(key);
        activeFetches++;
        scheduleIdle(() => {
            void resolveOne(key).finally(() => {
                activeFetches--;
                processQueue();
            });
        });
    }
};

const resolveOne = (key: string): Promise<string> => {
    const cached = getCachedPrefetchedImage(key);
    if (cached) return Promise.resolve(cached);

    const pending = inFlight.get(key);
    if (pending) return pending;

    const url = buildPicsumUrl(key);
    const request = new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
            memoryCache.set(key, url);
            writeToLocalStorage(key, url);
            console.log("[Prefetch Queue]: Cached image for ID", key);
            notify(key, url);
            resolve(url);
        };
        img.onerror = () => {
            // picsum.photos is effectively always reachable, but don't let a transient
            // failure wedge the queue or the caller's promise — just resolve with the URL.
            resolve(url);
        };
        img.src = url;
    }).finally(() => {
        inFlight.delete(key);
    });

    inFlight.set(key, request);
    return request;
};

/**
 * Queues one or more advert/category ids for background prefetching. Safe to call
 * repeatedly — already-cached, in-flight, or already-queued ids are skipped.
 */
export const enqueuePrefetch = (ids: Array<string | number>): void => {
    for (const raw of ids) {
        const key = String(raw);
        if (!key || key === "null" || key === "undefined") continue;
        if (memoryCache.has(key) || inFlight.has(key) || queued.has(key)) continue;
        queued.add(key);
        queue.push(key);
    }
    processQueue();
};

/** Fetches (or returns the already-cached) image URL for a single id — for on-demand use from UI. */
export const prefetchImage = (id: string | number): Promise<string> => resolveOne(String(id));

// --- Background discovery -------------------------------------------------------------
// Rather than requiring a dedicated "list every id" endpoint, the prefetcher watches the
// RTK Query caches for advertService/categoryService and walks whatever advert/category
// data has loaded through normal app usage, topping up the queue as new ids appear.

const collectIdsFromValue = (value: unknown, out: Set<string>, depth = 0): void => {
    if (value == null || depth > 3) return;

    if (Array.isArray(value)) {
        value.forEach((item) => collectIdsFromValue(item, out, depth + 1));
        return;
    }

    if (typeof value === "object") {
        const record = value as Record<string, unknown>;
        if (typeof record.id === "number" || typeof record.id === "string") {
            out.add(String(record.id));
        }
        if (Array.isArray(record.items)) collectIdsFromValue(record.items, out, depth + 1);
        if (Array.isArray(record.childs)) collectIdsFromValue(record.childs, out, depth + 1);
    }
};

interface QueryCacheSlice {
    queries?: Record<string, { data?: unknown } | undefined>;
}

const scanStoreForIds = (): void => {
    const state = store.getState() as unknown as Record<string, unknown>;
    const ids = new Set<string>();

    const categoryState = state[categoryService.reducerPath] as QueryCacheSlice | undefined;
    Object.values(categoryState?.queries ?? {}).forEach((entry) => collectIdsFromValue(entry?.data, ids));

    const advertState = state[advertService.reducerPath] as QueryCacheSlice | undefined;
    Object.values(advertState?.queries ?? {}).forEach((entry) => collectIdsFromValue(entry?.data, ids));

    const fresh: string[] = [];
    ids.forEach((id) => {
        if (!seenStateIds.has(id)) {
            seenStateIds.add(id);
            fresh.push(id);
        }
    });
    if (fresh.length > 0) enqueuePrefetch(fresh);
};

let scanScheduled = false;
const scheduleScan = (): void => {
    if (scanScheduled) return;
    scanScheduled = true;
    scheduleIdle(() => {
        scanScheduled = false;
        scanStoreForIds();
    });
};

let started = false;

/**
 * Starts the background prefetch queue: scans the store for advert/category ids now, then
 * keeps scanning (idle-scheduled) as the store updates. Safe to call multiple times —
 * only initializes once. No-op outside the browser (SSR/build).
 */
export const startBackgroundPrefetch = (): void => {
    if (started || !isBrowser) return;
    started = true;
    scheduleScan();
    store.subscribe(scheduleScan);
};

startBackgroundPrefetch();
