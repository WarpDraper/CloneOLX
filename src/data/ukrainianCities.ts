// Curated list of major Ukrainian cities for the City/Location filter shown in the header
// hero search bar and the CategoryListingPage sidebar. Kept as plain display names (not
// NewPost Area/Region/Settlement refs — that full cascading picker lives in
// components/location/SettlementPicker.tsx and is used for advert creation/profile forms,
// not for a quick catalog filter) so it filters uniformly against:
//  - the real API, via `settlementSearch` (a name substring search — see IAdvertPageRequest)
//  - the local seed fallback, via `advert.settlementName` (see seedHydration.ts)
export const UA_CITIES = [
    "Київ",
    "Львів",
    "Одеса",
    "Харків",
    "Дніпро",
    "Запоріжжя",
    "Вінниця",
    "Полтава",
] as const;

export type UACity = (typeof UA_CITIES)[number];

// adverts.seed.json only ships 4 distinct SettlementRef GUIDs (real Nova Poshta-style refs
// we can't resolve to a name client-side — same problem as CategoryId in SeederModels.ts).
// This maps each one to a display city name so seed-fallback listings can be labeled/filtered
// by city too, instead of always showing an empty settlementName.
export const SEED_SETTLEMENT_REF_TO_CITY: Record<string, string> = {
    "e718a680-4b33-11e4-ab6d-005056801329": "Київ",
    "e7191206-4b33-11e4-ab6d-005056801329": "Львів",
    "e71917a2-4b33-11e4-ab6d-005056801329": "Одеса",
    "e71ae3b4-4b33-11e4-ab6d-005056801329": "Харків",
};
