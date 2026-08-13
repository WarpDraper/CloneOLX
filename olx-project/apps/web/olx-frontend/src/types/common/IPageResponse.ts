// Дзеркалить Olx.BLL.Models.Page.PageResponse<T>
export interface IPageResponse<T> {
    total: number;
    items: T[];
}
