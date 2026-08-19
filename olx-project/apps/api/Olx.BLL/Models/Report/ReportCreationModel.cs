namespace Olx.BLL.Models.Report
{
    // POST /api/Report body — exactly one of AdvertId / TargetUserId is expected (validated by
    // ReportCreationModelValidator); ReporterId comes from the authenticated user, not the body.
    public class ReportCreationModel
    {
        public int? AdvertId { get; init; }
        public int? TargetUserId { get; init; }
        public string Reason { get; init; } = string.Empty;
        public string? Description { get; init; }
    }
}
