namespace Olx.BLL.DTOs.OlxUserDtos
{
    public class OlxUserShortDto
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Photo { get; set; }
        public DateTime LastActivity { get; set; }
        public DateTime CreatedDate { get; set; }
        public string? WebSite { get; set; }
        public string? SettlementDescrption { get; set; }
        public double Rating { get; set; }
        public int ReviewsCount { get; set; }
        // Live SignalR presence — stamped post-mapping by OnlineStatusExtensions.WithOnlineStatus
        // (backed by IConnectionTracker, not a DB column, so it can't be part of the AutoMapper
        // ProjectTo SQL projection itself). LastSeen mirrors LastActivity, which the presence hub
        // also refreshes on disconnect so it reflects the real last-seen moment, not just login.
        public bool IsOnline { get; set; }
        public DateTime LastSeen => LastActivity;
    }
}
