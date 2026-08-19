// DEPRECATED / UNUSED. The client-side "seed fallback" system that used to render synthetic
// mock adverts/categories/sellers (with negative ids) when the real API was empty/unreachable
// has been removed — the app must never show fake/placeholder data. No module in this codebase
// imports from this file anymore; it is kept only so any stray import fails loudly instead of
// silently resurrecting mock data. Safe to delete this file entirely.
export {};
