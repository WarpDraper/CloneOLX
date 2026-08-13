// Дзеркалить Olx.BLL.DTOs.CategoryDtos.CategoryDto (GET /api/category/get)
export interface ICategory {
    id: number;
    name: string;
    image: string | null;
    parentId: number | null;
    parentName: string | null;
    filters: number[];
    filterNames: string[];
    childs: ICategory[];
}
