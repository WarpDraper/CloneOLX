namespace Olx.BLL.DTOs.NewPost
{
    public class WarehousDto
    {
        public string Ref { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string SettlementRef { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;

        // Nova Poshta's getWarehouses response includes "Latitude"/"Longitude" (as JSON strings)
        // for every warehouse — mapped straight through here (Json.NET converts the numeric
        // string to double on deserialize) so the frontend can plot warehouses on a map instead
        // of only offering a plain dropdown. Nullable: older/edge-case warehouse records from
        // the NP API can omit coordinates, in which case the map picker just skips that pin.
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }

        // Nova Poshta's branch number ("Number" in the raw getWarehouses response) — used by the
        // frontend map/popups to render "Відділення №12" / "Поштомат №4501" instead of just the
        // free-text Description.
        public string? Number { get; set; }

        // "Branch" / "Postomat" / "Warehouse" — lets the frontend tell a parcel locker (поштомат)
        // apart from a staffed branch for labelling and marker styling.
        public string? CategoryOfWarehouse { get; set; }

        // Weekday -> hours string (e.g. "08:00-20:00" or "Зачинено"), keyed Monday..Sunday exactly
        // as Nova Poshta returns it — passed through as-is so the map popup can show working hours.
        public Dictionary<string, string>? Schedule { get; set; }

    }
}
