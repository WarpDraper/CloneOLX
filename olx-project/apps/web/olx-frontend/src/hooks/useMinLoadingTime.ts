import { useEffect, useRef, useState } from "react";

/**
 * Wraps a boolean `isLoading` flag so the returned value stays `true` for at least
 * `minMs` after loading starts, even if the underlying query/request resolves sooner.
 * Prevents the CubeLoader overlay from flashing on/off within a few milliseconds on
 * fast responses or cached seed-data fallbacks — smooths the transition instead of
 * an abrupt UI flash.
 */
export const useMinLoadingTime = (isLoading: boolean, minMs = 500): boolean => {
    const [minTimeElapsed, setMinTimeElapsed] = useState(!isLoading);
    const startRef = useRef<number | null>(isLoading ? Date.now() : null);

    useEffect(() => {
        if (isLoading) {
            startRef.current = Date.now();
            setMinTimeElapsed(false);
            return;
        }

        const elapsed = startRef.current !== null ? Date.now() - startRef.current : minMs;
        const remaining = Math.max(minMs - elapsed, 0);

        if (remaining === 0) {
            setMinTimeElapsed(true);
            return;
        }

        const timer = setTimeout(() => setMinTimeElapsed(true), remaining);
        return () => clearTimeout(timer);
    }, [isLoading, minMs]);

    return isLoading || !minTimeElapsed;
};
