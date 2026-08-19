namespace Olx.BLL.Models.Report
{
    // PUT /api/Report/{id}/resolve and PUT /api/Report/{id}/reject body — both optional actions
    // default to false (just closes the report with the corresponding status).
    public class ReportResolutionModel
    {
        // Blocks TargetUser (via IAccountService.BlockUserAsync) — no-op if the report has no
        // TargetUserId.
        public bool BanUser { get; init; }

        // Sets Advert.Blocked = true (via IAdvertService.AdminUpdateAsync) — no-op if the report
        // has no AdvertId.
        public bool UnpublishAdvert { get; init; }
    }
}
