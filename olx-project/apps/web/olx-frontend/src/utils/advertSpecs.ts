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
import type { IAdvert } from "../types/advert/IAdvert";
import { getSeedFilters } from "./seedHydration";

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
const CONDITION_FILTER_NAME = "Стан";
const NEW_CONDITION_VALUES = new Set(["Нове", "Новий"]);

export interface ShortSpec {
    key: string;
    label: string;
    icon: ComponentType;
}

/**
 * Best-effort filterId -> name resolver. Prefers an explicit map (e.g. the category facets
 * a listing page already loaded) and falls back to the local filters.seed.json catalogue,
 * which covers seed-fallback adverts (synthetic filterIds). Real-API filterIds with no facet
 * map available simply can't be named here — callers skip them rather than showing a raw
 * "Характеристика #id" on a card.
 */
const resolveFilterName = (filterId: number, filterNameById?: Map<number, string>): string | undefined => {
    if (filterNameById?.has(filterId)) return filterNameById.get(filterId);
    return getSeedFilters().find((f) => f.id === filterId)?.name;
};

/**
 * "Нове" condition badge label for a new-condition advert, or undefined otherwise — used-condition
 * adverts intentionally get no label at all (no "Б/У" badge is ever rendered, per spec) rather
 * than a second, less prominent badge value.
 */
export const getConditionLabel = (advert: IAdvert, filterNameById?: Map<number, string>): string | undefined => {
    const fv = advert.filterValues.find((v) => resolveFilterName(v.filterId, filterNameById) === CONDITION_FILTER_NAME);
    if (!fv || !NEW_CONDITION_VALUES.has(fv.value)) return undefined;
    return "Нове";
};

/** Up to MAX_SHORT_SPECS concise, icon-labeled specs for a card (condition excluded — see getConditionLabel). */
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
