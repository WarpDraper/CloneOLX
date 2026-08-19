import type { ComponentType } from "react";
import {
    ThunderboltOutlined,
    SettingOutlined,
    FireOutlined,
    DashboardOutlined,
    DatabaseOutlined,
    HddOutlined,
    CarOutlined,
    TagOutlined,
} from "@ant-design/icons";
import { ItemCondition, type IAdvert } from "../types/advert/IAdvert";

// Filter names surfaced as short, icon-labeled specs on advert cards, in priority order —
// cars first (engine/transmission/fuel/mileage/brand/body), then tech (RAM/storage/CPU/screen).
// Any filter present on the advert but not listed here still renders, just with a generic icon
// and lower priority, so cards stay useful even for categories without a curated mapping.
const SHORT_SPEC_ICONS: Record<string, ComponentType> = {
    "Об'єм двигуна": ThunderboltOutlined,
    "Коробка передач": SettingOutlined,
    "Вид палива": FireOutlined,
    "Пробіг": DashboardOutlined,
    "Технічний стан": SettingOutlined,
    "Марка": TagOutlined,
    "Тип кузова": CarOutlined,
    "Об'єм оперативної пам'яті": DatabaseOutlined,
    "Об'єм накопичувача": HddOutlined,
    "Тип накопичувача": HddOutlined,
    "Тип процесора": ThunderboltOutlined,
    "Розмір екрану": DashboardOutlined,
};

const SHORT_SPEC_PRIORITY = Object.keys(SHORT_SPEC_ICONS);
const MAX_SHORT_SPECS = 4;
export const CONDITION_FILTER_NAME = "Стан";
const NEW_CONDITION_VALUES = new Set(["Нове", "Новий"]);
const USED_CONDITION_VALUES = new Set(["Б/в", "Вживане", "Вживаний"]);

// Category (sub)tree names/slugs where "new/used" condition is meaningless — services, jobs,
// real estate, pets, dating/matchmaking, giveaways, etc. Matched as a case-insensitive substring
// against the category's own name/slug, so this covers a whole branch (e.g. any "Авто-послуги"
// or "...послуги..." subcategory) without needing an explicit id list that has to be kept in
// sync with Categories.json. Backend already seeds these categories with Advert.Condition = None
// (see DbSeeder.GetSeededCondition) and never attaches the "Стан" Filter to them (Categories.json) —
// this is a frontend-side safety net so a badge/filter can't reappear here from a legacy
// filter-value fallback or a future admin miscategorization, without depending on that backend
// data staying perfectly in sync.
const NON_GOODS_CATEGORY_KEYWORDS = [
    // Services / jobs / free / dating
    "послуг",
    "робот",
    "вакансі",
    "знайом",
    "віддам",
    "авто-послуги",
    "сервіс",
    "service",
    "job",
    "free",
    // Pets / animals
    "тварин",
    "кіт",
    "кот",
    "кошен",
    "собак",
    "цуцен",
    "пес",
    "цуцик",
    "птахи",
    "папуг",
    "гризун",
    "акваріум",
    "pet",
    "cat",
    "dog",
    "puppy",
    "kitten",
    // Real estate
    "нерухом",
    "оренд",
    "квартир",
    "кімнат",
    "будинок",
    "ділянк",
    "гараж",
    "приміщен",
    "realty",
    "rent",
    "apartment",
    "flat",
    "house",
];

/**
 * Whether "new/used" condition makes sense for a category, by case-insensitive substring match
 * against its name, slug, and (as a fallback for adverts missing category info) title. Categories
 * with neither a name nor a slug nor a title (nothing to check) default to `true` — condition
 * stays visible rather than silently disappearing for adverts whose category couldn't be resolved.
 */
export const isConditionApplicable = (
    categoryName?: string | null,
    categorySlug?: string | null,
    title?: string | null
): boolean => {
    const haystack = `${categoryName ?? ""} ${categorySlug ?? ""} ${title ?? ""}`.trim().toLowerCase();
    if (!haystack) return true;
    return !NON_GOODS_CATEGORY_KEYWORDS.some((keyword) => haystack.includes(keyword));
};

export interface ShortSpec {
    key: string;
    label: string;
    icon: ComponentType;
}

export interface ConditionBadge {
    type: "used" | "new";
}

/**
 * filterId -> name resolver from an explicit map (e.g. the category facets a listing page
 * already loaded). Filter ids with no facet map available simply can't be named here — callers
 * skip them rather than showing a raw "Характеристика #id" on a card.
 */
const resolveFilterName = (filterId: number, filterNameById?: Map<number, string>): string | undefined =>
    filterNameById?.get(filterId);

/**
 * Condition badge descriptor ("used" or "new") for an advert, or undefined when condition is
 * `None` (services/pets/real-estate — condition doesn't apply) and can't otherwise be inferred.
 * Callers render the actual localized label/styling themselves (see `adverts.condition.*` i18n
 * keys) — this only decides *whether* a badge shows and which of the two variants it is.
 *
 * Prefers the real Advert.Condition column (ItemCondition — see AdvertDto) when it's set; falls
 * back to the older "Стан" filter-value heuristic for adverts seeded/created before that column
 * existed, so already-listed adverts don't lose their badge.
 */
export const getConditionBadge = (advert: IAdvert, filterNameById?: Map<number, string>): ConditionBadge | undefined => {
    if (!isConditionApplicable(advert.categoryName, undefined, advert.title)) return undefined;
    if (advert.condition === ItemCondition.New) return { type: "new" };
    if (advert.condition === ItemCondition.Used) return { type: "used" };

    const fv = advert.filterValues.find((v) => resolveFilterName(v.filterId, filterNameById) === CONDITION_FILTER_NAME);
    if (!fv) return undefined;
    if (NEW_CONDITION_VALUES.has(fv.value)) return { type: "new" };
    if (USED_CONDITION_VALUES.has(fv.value)) return { type: "used" };
    return undefined;
};

/** Up to MAX_SHORT_SPECS concise, icon-labeled specs for a card (condition excluded — see getConditionBadge). */
export const getShortSpecs = (advert: IAdvert, filterNameById?: Map<number, string>): ShortSpec[] => {
    const named = advert.filterValues
        .map((fv) => ({ fv, name: resolveFilterName(fv.filterId, filterNameById) }))
        .filter((entry): entry is { fv: IAdvert["filterValues"][number]; name: string } =>
            !!entry.name && entry.name !== CONDITION_FILTER_NAME
        );

    named.sort((a, b) => {
        const rankOf = (name: string) => {
            const i = SHORT_SPEC_PRIORITY.indexOf(name);
            return i === -1 ? SHORT_SPEC_PRIORITY.length : i;
        };
        return rankOf(a.name) - rankOf(b.name);
    });

    return named.slice(0, MAX_SHORT_SPECS).map(({ fv, name }) => ({
        key: String(fv.id),
        label: fv.value,
        icon: SHORT_SPEC_ICONS[name] ?? TagOutlined,
    }));
};
