namespace Olx.BLL.DTOs.ReportDtos
{
    // GET /api/Report/pending item shape — flattened with target details so ReportsPage (admin)
    // doesn't need a second round-trip to show who/what was reported.
    public class ReportDto
    {
        public int Id { get; set; }

        public int ReporterId { get; set; }
        public string ReporterName { get; set; } = string.Empty;
        public string ReporterEmail { get; set; } = string.Empty;

        // "advert" | "user" — mirrors which of AdvertId/TargetUserId is set.
        public string TargetType { get; set; } = string.Empty;
        public int TargetId { get; set; }
        public string TargetLabel { get; set; } = string.Empty;

        public string Reason { get; set; } = string.Empty;
        public string? Description { get; set; }

        // "Pending" | "Resolved" | "Rejected"
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
