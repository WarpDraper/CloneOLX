using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Olx.BLL.Entities
{
    // Persisted, per-user notification (header bell dropdown + /notifications page).
    // TargetUrl is an optional client-side route (e.g. "/chat", "/advert/123") the frontend
    // navigates to when the notification is clicked — resolved/validated client-side, not here.
    [Table("tbl_Notifications")]
    public class Notification : BaseEntity
    {
        public int UserId { get; set; }
        public OlxUser User { get; set; } = null!;

        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [StringLength(2000)]
        public string Message { get; set; } = string.Empty;

        [StringLength(500)]
        public string? TargetUrl { get; set; }

        public NotificationType Type { get; set; } = NotificationType.General;

        public bool IsRead { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
