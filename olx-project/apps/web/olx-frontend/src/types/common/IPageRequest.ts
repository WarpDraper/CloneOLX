// Дзеркалить Olx.BLL.Models.Page.PageRequest
export interface IPageRequest {
    size: number;
    page: number;
    sortKey?: string;
    isDescending?: boolean;
}
