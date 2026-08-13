// Дзеркалить Olx.BLL.DTOs.NewPost.AreaDto (GET /api/newpost/areas)
export interface IArea {
    ref: string;
    description: string;
    regionType: string;
    regions: string[];
}
