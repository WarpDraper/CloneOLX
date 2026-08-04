// Дзеркалить Olx.BLL.DTOs.NewPost.SettlementDto (GET /api/newpost/region/settlements?regionRef= або /api/newpost/settlements?settlementRef=)
export interface ISettlement {
    ref: string;
    description: string;
    settlementTypeDescription: string;
    region: string | null;
    area: string | null;
    warehouse: number;
}
