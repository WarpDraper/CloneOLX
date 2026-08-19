using Microsoft.EntityFrameworkCore;
using Olx.BLL.DTOs.NotificationDtos;
using Olx.BLL.Entities;
using Olx.BLL.Exceptions;
using Olx.BLL.Interfaces;
using Olx.BLL.Models.Page;
using System.Net;

namespace Olx.BLL.Services
{
    public class NotificationService(IRepository<Notification> notificationRepository) : INotificationService
    {
        public async Task<PageResponse<NotificationDto>> GetMyNotificationsAsync(int userId, int page, int pageSize)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;

            var query = notificationRepository.GetQuery()
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt);

            var total = await query.CountAsync();
            var entities = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToArrayAsync();

            return new PageResponse<NotificationDto>
            {
                Total = total,
                Items = entities.Select(MapToDto).ToArray()
            };
        }

        public async Task<TopUnreadNotificationsDto> GetTopUnreadNotificationsAsync(int userId, int count = 3)
        {
            if (count < 1) count = 3;

            var unreadQuery = notificationRepository.GetQuery()
                .Where(n => n.UserId == userId && !n.IsRead);

            var unreadCount = await unreadQuery.CountAsync();
            var entities = await unreadQuery
                .OrderByDescending(n => n.CreatedAt)
                .Take(count)
                .ToArrayAsync();

            return new TopUnreadNotificationsDto
            {
                Items = entities.Select(MapToDto).ToArray(),
                UnreadCount = unreadCount
            };
        }

        public async Task<int> GetUnreadCountAsync(int userId) =>
            await notificationRepository.GetQuery()
                .Where(n => n.UserId == userId && !n.IsRead)
                .CountAsync();

        public async Task MarkAsReadAsync(int notificationId, int userId)
        {
            var notification = await notificationRepository.GetQuery(QueryTrackingBehavior.TrackAll)
                .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId)
                ?? throw new HttpException("Notification not found.", HttpStatusCode.NotFound);

            if (!notification.IsRead)
            {
                notification.IsRead = true;
                await notificationRepository.SaveAsync();
            }
        }

        public async Task MarkAllAsReadAsync(int userId)
        {
            var unread = await notificationRepository.GetQuery(QueryTrackingBehavior.TrackAll)
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync();

            if (unread.Count == 0) return;

            foreach (var notification in unread)
            {
                notification.IsRead = true;
            }

            await notificationRepository.SaveAsync();
        }

        public async Task CreateAsync(int userId, string title, string message, string? targetUrl = null, NotificationType type = NotificationType.General)
        {
            var notification = new Notification
            {
                UserId = userId,
                Title = title,
                Message = message,
                TargetUrl = targetUrl,
                Type = type,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            await notificationRepository.AddAsync(notification);
            await notificationRepository.SaveAsync();
        }

        public Task CreateWelcomeNotificationAsync(int userId) =>
            CreateAsync(
                userId,
                "Ласкаво просимо на OLX Clone!",
                "Ласкаво просимо на OLX Clone! Дякуємо за реєстрацію.",
                type: NotificationType.Welcome);

        private static NotificationDto MapToDto(Notification n) => new()
        {
            Id = n.Id,
            Title = n.Title,
            Message = n.Message,
            TargetUrl = n.TargetUrl,
            Type = n.Type,
            IsRead = n.IsRead,
            CreatedAt = n.CreatedAt
        };
    }
}
