// Дзеркалить Olx.BLL.DTOs.NewPostDtos.WarehousDto (GET /api/newpost/settlements/warehouses?settlementRef=)
export interface IWarehouse {
    ref: string;
    description: string;
    settlementRef: string;
    phone: string;
    /** Nova Poshta coordinates for the map picker — omitted/null for the rare warehouse the NP API doesn't geocode. */
    latitude?: number | null;
    longitude?: number | null;
}
