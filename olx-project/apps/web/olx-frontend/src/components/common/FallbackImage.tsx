import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { isBackendImageUrl, reportBackendImageFailure, reportBackendImageSuccess } from "../../utils/buildImageUrl";

interface FallbackImageProps {
    /** Local/backend image URL, if any. */
    src?: string | null;
    /** Unused now that the Unsplash keyword-search fallback is disabled — kept optional so
     *  existing call sites (AdvertCard, CategoryAvatar, etc.) don't need to change. */
    fallbackKeyword?: string;
    /** Unused now that the Unsplash keyword-search fallback is disabled — kept optional for
     *  call-site compatibility. */
    uniqueSeed?: string | number;
    alt: string;
    className?: string;
    /** Rendered whenever no local/backend image is available (missing `src`, or the backend
     *  URL 404s / the connection is refused, e.g. ERR_CONNECTION_REFUSED when :5005 is down).
     *  Optional — defaults to DEFAULT_IMAGE_PLACEHOLDER (a zero-network inline SVG) below, so
     *  callers that don't need a custom look never render a broken-image icon. */
    placeholder?: React.ReactNode;
    /** Native `<img loading>` hint. Defaults to "lazy" — the browser defers the network
     *  request until the image is near the viewport instead of firing it at mount time. Safe
     *  default for grids/menus with many images (category rails, mega-menu strip, listings);
     *  callers that render a single known-above-the-fold hero image can pass "eager" to opt out.
     *  Purely a load-timing hint — has no effect on how the image looks once rendered. */
    loading?: "lazy" | "eager";
    /** Native `<img decoding>` hint. Defaults to "async" so image decoding never blocks the
     *  main thread / first paint. */
    decoding?: "async" | "sync" | "auto";
}

// Zero-network default placeholder: a plain inline SVG data URI. Used whenever a caller
// doesn't pass its own `placeholder` — guarantees callers never fall through to the browser's
// broken-image icon, without depending on an external host (which could itself be unreachable,
// e.g. offline dev) the way https://placehold.co/600x400?text=No+Photo would.
const DEFAULT_IMAGE_PLACEHOLDER_SVG =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='28' fill='%23999'%3ENo Photo%3C/text%3E%3C/svg%3E";

export const DefaultImagePlaceholder: React.FC<{ className?: string; alt?: string }> = ({ className, alt }) => {
    const { t } = useTranslation();
    return <img src={DEFAULT_IMAGE_PLACEHOLDER_SVG} alt={alt ?? t('common.noPhoto')} className={className} />;
};

// Memory of image URLs that already failed to load once — e.g. backend seed fixtures
// referencing {size}_{name}.webp files (http://localhost:5005/images/200_*.webp,
// .../1200_*.webp, etc.) that were never generated on disk (dev/offline DB). The same broken
// cover photo often renders in several places at once (home feed, recommendations, gallery,
// list view), and again on every later page load/navigation — so this is persisted to
// localStorage (not just an in-memory Set) and capped to bound its size. Once a URL is in
// here, no mount ever points an <img> at it again, so it can never re-fire the doomed request.
const BROKEN_SRC_STORAGE_KEY = "img-broken-src-cache";
const MAX_TRACKED_BROKEN_SRC = 500;
const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const loadKnownBrokenSrc = (): Set<string> => {
    if (!isBrowser) return new Set();
    try {
        const raw = window.localStorage.getItem(BROKEN_SRC_STORAGE_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(parsed) ? (parsed as string[]) : []);
    } catch {
        return new Set();
    }
};

const knownBrokenSrc = loadKnownBrokenSrc();

const rememberBrokenSrc = (src: string): void => {
    knownBrokenSrc.add(src);
    if (!isBrowser) return;
    try {
        // Trim from the front once over the cap so this can't grow unbounded across a long session.
        const list = [...knownBrokenSrc];
        const trimmed = list.length > MAX_TRACKED_BROKEN_SRC ? list.slice(list.length - MAX_TRACKED_BROKEN_SRC) : list;
        window.localStorage.setItem(BROKEN_SRC_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
        // Storage full/unavailable — the in-memory Set still covers the rest of this session.
    }
};

// Image with a strictly static, local fallback — NO Unsplash (or any other online image
// service) is ever contacted. Renders `src` when present and not already known to be broken;
// the moment it's missing or fails to load, this renders the caller-supplied local
// `placeholder` and stops — no keyword search, no background prefetch, no dynamic swap-in of
// an externally-hosted photo. All real images must come from the local/backend static store
// (apps/api/OLX.API/wwwroot/images/, via buildImageUrl.ts) or a relative /public asset.
const FallbackImage: React.FC<FallbackImageProps> = ({ src, alt, className, placeholder, loading = "lazy", decoding = "async" }) => {
    const usableSrc = src && !knownBrokenSrc.has(src) ? src : null;
    const [resolvedSrc, setResolvedSrc] = useState<string | null>(usableSrc);
    const [broken, setBroken] = useState(!!src && !usableSrc);
    // Tracks which `src` the state above was derived from, so a prop change can be applied
    // by adjusting state during render (React's recommended pattern) instead of in an effect —
    // avoids an extra commit/render pass for what's essentially a derived value.
    const [srcForState, setSrcForState] = useState(src);

    if (src !== srcForState) {
        setSrcForState(src);
        setResolvedSrc(usableSrc);
        setBroken(!!src && !usableSrc);
    }

    if (!resolvedSrc || broken) {
        return <>{placeholder ?? <DefaultImagePlaceholder className={className} alt={alt} />}</>;
    }

    return (
        <img
            src={resolvedSrc}
            alt={alt}
            className={className}
            loading={loading}
            decoding={decoding}
            onLoad={() => {
                // A real backend {size}_{name}.webp URL just loaded successfully — clears the
                // circuit breaker below so a transient blip (seeder mid-run, etc.) doesn't keep
                // suppressing backend image requests longer than the actual outage.
                if (resolvedSrc && isBackendImageUrl(resolvedSrc)) reportBackendImageSuccess();
            }}
            onError={() => {
                // Backend seed data can reference webp files that were never generated on disk
                // (dev/offline DB) — expected/recoverable, not a hard error, so this stays a
                // console.warn (not .error) and only fires once per unique src (guarded by the
                // knownBrokenSrc check) rather than once per mounted card, so a single dead cover
                // photo shared across the feed doesn't spam the console. Still logs *something*
                // by design — a silently-swallowed broken image URL is exactly the kind of thing
                // that hides a real backend/mapping bug (e.g. a list endpoint never returning
                // photos) behind "well, the placeholder rendered, so it's fine".
                if (resolvedSrc) {
                    if (!knownBrokenSrc.has(resolvedSrc)) {
                        console.warn(`[Image ✕] Failed to load: ${resolvedSrc}`, { alt });
                    }
                    rememberBrokenSrc(resolvedSrc);
                    if (isBackendImageUrl(resolvedSrc)) reportBackendImageFailure();
                }
                setBroken(true);
            }}
        />
    );
};

export default FallbackImage;
