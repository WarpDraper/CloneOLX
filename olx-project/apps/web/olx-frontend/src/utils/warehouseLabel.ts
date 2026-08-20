import type { IWarehouse } from "../types/location/IWarehouse";

// Shared helpers for rendering a Nova Poshta warehouse consistently everywhere it shows up
// (map markers/popups, the profile delivery panel list, the checkout warehouse list) — kept in
// one place so "Відділення №12" vs "Поштомат №4501" labelling never drifts between them.

// NP's "CategoryOfWarehouse" is the authoritative signal; Description is checked as a fallback
// for older cached warehouses fetched before that field existed on the DTO.
export const isPostomat = (warehouse: Pick<IWarehouse, "categoryOfWarehouse" | "description">): boolean =>
    (warehouse.categoryOfWarehouse ?? "").toLowerCase() === "postomat" || /поштомат/i.test(warehouse.description);

// i18next's `t` — typed loosely here to avoid importing the full i18next types into a plain util.
type Translate = (key: string) => string;

export const branchLabel = (warehouse: Pick<IWarehouse, "number" | "categoryOfWarehouse" | "description">, t: Translate): string => {
    const kind = isPostomat(warehouse) ? t("warehouseMapPicker.postomat") : t("warehouseMapPicker.branch");
    return warehouse.number ? `${kind} №${warehouse.number}` : kind;
};

const SCHEDULE_DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

// Nova Poshta's raw Schedule is keyed Monday..Sunday; JS's Date#getDay() is 0=Sunday, hence the
// +6 % 7 shift to land on the same Monday-first index used by SCHEDULE_DAY_ORDER.
export const todaysHours = (schedule?: Record<string, string> | null): string | null => {
    if (!schedule) return null;
    const todayKey = SCHEDULE_DAY_ORDER[(new Date().getDay() + 6) % 7];
    return schedule[todayKey] ?? null;
};
