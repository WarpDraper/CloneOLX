// Дзеркалить Olx.BLL.DTOs.NewPost.RegionDto (GET /api/newpost/areas/regions?areaRef=)
export interface IRegion {
    ref: string;
    description: string;
    regionType: string;
    areaRef: string;
}
