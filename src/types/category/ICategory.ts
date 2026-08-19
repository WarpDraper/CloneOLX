// Дзеркалить Olx.BLL.DTOs.CategoryDtos.CategoryDto (GET /api/category/get)
export interface ICategory {
    id: number;
    name: string;
    // Optional per-locale overrides — null/empty when an admin hasn't translated this category
    // yet. See utils/getCategoryName.ts for the display-name fallback chain.
    nameUk?: string | null;
    nameEn?: string | null;
    slug?: string | null;
    sortOrder?: number;
    image: string | null;
    parentId: number | null;
    parentName: string | null;
    filters: number[];
    filterNames: string[];
    childs: ICategory[];
}
