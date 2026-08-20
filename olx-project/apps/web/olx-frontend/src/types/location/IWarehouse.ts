// Дзеркалить Olx.BLL.DTOs.NewPostDtos.WarehousDto (GET /api/newpost/settlements/warehouses?settlementRef=)
export interface IWarehouse {
    ref: string;
    description: string;
    settlementRef: string;
    phone: string;
    /** Nova Poshta coordinates for the map picker — omitted/null for the rare warehouse the NP API doesn't geocode. */
    latitude?: number | null;
    longitude?: number | null;
    /** Branch number, e.g. "12" for "Відділення №12" — omitted for the rare record NP doesn't return it for. */
    number?: string | null;
    /** "Branch" | "Postomat" | "Warehouse" (raw NP value) — used to label branches vs. поштомати. */
    categoryOfWarehouse?: string | null;
    /** Weekday ("Monday".."Sunday") -> hours string, straight from the NP API. */
    schedule?: Record<string, string> | null;
}
