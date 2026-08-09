import React, { useState } from "react";
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
    /** Rendered whenever no local/backend image is available — the sole fallback now that the
     *  Unsplash/online-swap path has been removed. Should be a static, local placeholder
     *  (icon, SVG, etc.), never something that triggers a network request. */
    placeholder: React.ReactNode;
}

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
const FallbackImage: React.FC<FallbackImageProps> = ({ src, alt, className, placeholder }) => {
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

    if (!resolvedSrc || broken) return <>{placeholder}</>;

    return (
        <img
            src={resolvedSrc}
            alt={alt}
            className={className}
            onLoad={() => {
                // A real backend {size}_{name}.webp URL just loaded successfully — clears the
                // circuit breaker below so a transient blip (seeder mid-run, etc.) doesn't keep
                // suppressing backend image requests longer than the actual outage.
                if (resolvedSrc && isBackendImageUrl(resolvedSrc)) reportBackendImageSuccess();
            }}
            onError={() => {
                // Backend seed data can reference webp files that were never generated on disk
                // (dev/offline DB) — expected/recoverable, not a real error, so no console
                // logging here. Remember the URL so no other mount of the same broken cover
                // photo re-fires the request, then fall straight to the local `placeholder` —
                // no online fallback is attempted. Also feeds the circuit breaker
                // (buildImageUrl.ts) so once enough of these dead requests happen in a row,
                // later calls skip straight to null instead of firing another doomed GET.
                if (resolvedSrc) {
                    rememberBrokenSrc(resolvedSrc);
                    if (isBackendImageUrl(resolvedSrc)) reportBackendImageFailure();
                }
                setBroken(true);
            }}
        />
    );
};

export default FallbackImage;
