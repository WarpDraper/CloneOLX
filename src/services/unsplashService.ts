// Unsplash integration is DISABLED. No network requests to api.unsplash.com are made from
// this module (or anywhere else) — every call resolves immediately to a static, local SVG
// placeholder data URI. Kept as a no-op module (instead of deleting it) so any remaining
// import sites keep compiling without a network-dependent image fallback.

const LOCAL_PLACEHOLDER_DATA_URI =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">' +
            '<rect width="400" height="300" fill="#F1F0F6"/>' +
            '<path d="M150 190h100l-28-40-22 28-14-16-36 28z" fill="#C9C6DA"/>' +
            '<circle cx="170" cy="130" r="14" fill="#C9C6DA"/>' +
            "</svg>"
    );

/**
 * @deprecated Unsplash fallback fetching has been removed. Always resolves synchronously
 * (wrapped in a Promise for call-site compatibility) to a static local SVG placeholder —
 * never performs a network request and never returns an external URL.
 */
export const getUnsplashPhotoUrl = async (): Promise<string> => LOCAL_PLACEHOLDER_DATA_URI;
