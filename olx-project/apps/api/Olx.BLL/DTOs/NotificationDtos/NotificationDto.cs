using Olx.BLL.Entities;

namespace Olx.BLL.DTOs.NotificationDtos
{
    // Shape returned by every read endpoint on NotificationController (list, top-unread).
    public class NotificationDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? TargetUrl { get; set; }
        public NotificationType Type { get; set; } = NotificationType.General;
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
