namespace Olx.BLL.Entities
{
    // Стан скарги (Report) — на оголошення (AdvertId) або на користувача/продавця (TargetUserId).
    public enum ReportStatus
    {
        Pending = 0,
        Resolved = 1,
        Rejected = 2
    }
}
