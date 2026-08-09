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

    }
}
