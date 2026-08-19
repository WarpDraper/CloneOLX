import type { ICategory } from "../types/category/ICategory";

// Resolves a category's display name for the given i18next language, falling back to the
// canonical `name` (and finally the other locale) whenever a translation hasn't been filled in
// yet — categories are only ever seeded/created with `name`, so NameUk/NameEn stay optional
// until an admin (or CategoryController's auto-translate) backfills them.
export function getCategoryName(category: Pick<ICategory, "name" | "nameUk" | "nameEn">, language: string): string {
    if (language.startsWith("en")) {
        return category.nameEn || category.name || category.nameUk || "";
    }
    return category.nameUk || category.name || category.nameEn || "";
}
