import React, { useEffect, useState } from "react";
import { getUnsplashPhotoUrl } from "../../services/unsplashService";
import { getCachedPrefetchedImage, prefetchImage, subscribeToPrefetch } from "../../services/imagePrefetcher";

interface FallbackImageProps {
    /** Local/backend image URL, if any. */
    src?: string | null;
    /** Keyword used for the Unsplash fallback search (item title or category name). */
    fallbackKeyword: string;
    /** Distinguishes cards sharing the same fallbackKeyword (advert/category id) so each resolves a distinct Unsplash photo instead of a duplicate. */
    uniqueSeed?: string | number;
    alt: string;
    className?: string;
    /** Rendered while no image (local or fallback) is available yet. */
    placeholder: React.ReactNode;
}

// Image with an Unsplash-backed fallback: renders `src` when present, transparently
// swaps to a keyword-matched Unsplash photo if `src` is missing or fails to load,
// and falls back to `placeholder` while nothing is resolved yet (including when
// Unsplash returns empty results — never throws/crashes the render).
const FallbackImage: React.FC<FallbackImageProps> = ({ src, fallbackKeyword, uniqueSeed, alt, className, placeholder }) => {
    const initialCached = uniqueSeed !== undefined ? getCachedPrefetchedImage(uniqueSeed) : null;
    const [resolvedSrc, setResolvedSrc] = useState<string | null>(src ?? initialCached);
    const [broken, setBroken] = useState(false);

    useEffect(() => {
        setResolvedSrc(src ?? (uniqueSeed !== undefined ? getCachedPrefetchedImage(uniqueSeed) : null));
        setBroken(false);
    }, [src, uniqueSeed]);

    // Fast path: id-keyed images the background prefetcher already warmed (or is about to).
    // Checks the local cache first and serves immediately; otherwise kicks off a background
    // fetch and pops the resolved photo into state the moment it lands.
    useEffect(() => {
        if ((resolvedSrc && !broken) || uniqueSeed === undefined) return;

        const cached = getCachedPrefetchedImage(uniqueSeed);
        if (cached) {
            setResolvedSrc(cached);
            setBroken(false);
            return;
        }

        let cancelled = false;
        const unsubscribe = subscribeToPrefetch(uniqueSeed, (url) => {
            if (cancelled) return;
            setResolvedSrc(url);
            setBroken(false);
        });
        void prefetchImage(uniqueSeed);

        return () => {
            cancelled = true;
            unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [broken, uniqueSeed, resolvedSrc]);

    // Legacy fallback: only reached when the caller didn't pass a uniqueSeed to key the
    // prefetch cache off of, so a keyword-based Unsplash lookup is the best we can do.
    useEffect(() => {
        if ((resolvedSrc && !broken) || uniqueSeed !== undefined) return;

        let cancelled = false;
        getUnsplashPhotoUrl(fallbackKeyword, "small", uniqueSeed).then((url) => {
            if (cancelled) return;
            console.log('[Image Load]:', { title: alt, url: url ?? null });
            if (url) {
                setResolvedSrc(url);
                setBroken(false);
            }
        });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [broken, fallbackKeyword, uniqueSeed, resolvedSrc]);

    if (!resolvedSrc || broken) return <>{placeholder}</>;

    return (
        <img
            src={resolvedSrc}
            alt={alt}
            className={className}
            onError={() => {
                console.log('[Image Load]:', { title: alt, url: resolvedSrc });
                console.error(`[FallbackImage] Broken image source for "${alt}":`, resolvedSrc);
                setBroken(true);
            }}
        />
    );
};

export default FallbackImage;
