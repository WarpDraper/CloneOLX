// Curated list of major Ukrainian cities for the City/Location filter shown in the header
// hero search bar and the CategoryListingPage sidebar. Kept as plain display names (not
// NewPost Area/Region/Settlement refs — that full cascading picker lives in
// components/location/SettlementPicker.tsx and is used for advert creation/profile forms,
// not for a quick catalog filter) so it filters uniformly against the real API, via
// `settlementSearch` (a name substring search — see IAdvertPageRequest).
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
