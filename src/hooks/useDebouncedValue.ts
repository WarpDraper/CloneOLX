import { useEffect, useState } from "react";

/**
 * Returns `value`, but only updates after it has stayed unchanged for `delayMs`.
 * Standard debounce for search/filter inputs so we don't refetch or re-filter
 * the listing on every keystroke — only once the user pauses typing.
 */
export const useDebouncedValue = <T,>(value: T, delayMs = 350): T => {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(timer);
    }, [value, delayMs]);

    return debounced;
};
