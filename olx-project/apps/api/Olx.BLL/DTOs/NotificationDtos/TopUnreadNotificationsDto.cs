namespace Olx.BLL.DTOs.NotificationDtos
{
    // GET /api/Notification/top-unread response — the header bell dropdown needs both the
    // (at most 3) most recent unread notifications AND the true total unread count in one
    // round-trip, since the badge number and the list length aren't the same thing once the
    // user has more than `count` unread notifications.
    public class TopUnreadNotificationsDto
    {
        public IEnumerable<NotificationDto> Items { get; set; } = [];
        public int UnreadCount { get; set; }
    }
}
