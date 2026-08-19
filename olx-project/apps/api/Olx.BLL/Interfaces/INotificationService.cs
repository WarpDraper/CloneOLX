using Olx.BLL.DTOs.NotificationDtos;
using Olx.BLL.Entities;
using Olx.BLL.Models.Page;

namespace Olx.BLL.Interfaces
{
    public interface INotificationService
    {
        // Paginated feed for /notifications (page/pageSize are 1-based / item-count, matching
        // PageRequest.Page and PageRequest.Size elsewhere in the app).
        Task<PageResponse<NotificationDto>> GetMyNotificationsAsync(int userId, int page, int pageSize);

        // Header bell dropdown: most recent `count` unread notifications + the total unread count.
        Task<TopUnreadNotificationsDto> GetTopUnreadNotificationsAsync(int userId, int count = 3);

        Task<int> GetUnreadCountAsync(int userId);

        Task MarkAsReadAsync(int notificationId, int userId);

        Task MarkAllAsReadAsync(int userId);

        // Generic creation used by other BLL services (e.g. AccountService's welcome
        // notification on registration / first Google sign-in) that need to insert a
        // tbl_Notifications row without depending on NotificationController's shape.
        Task CreateAsync(int userId, string title, string message, string? targetUrl = null, NotificationType type = NotificationType.General);

        // Fires once per new (non-admin) account — standard registration AND first-time Google
        // OAuth sign-in both funnel through AccountService.CreateUserAsync, so wiring the call
        // in there covers both without duplicating it at each call site.
        Task CreateWelcomeNotificationAsync(int userId);
    }
}
