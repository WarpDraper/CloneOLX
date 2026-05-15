using AuthBLL.EmailService;
using Microsoft.AspNetCore.Identity;
using Domain;
using Microsoft.Extensions.Logging;

namespace BLL.NotificationService;

public interface INotificationService
{
    Task NotifyUserBannedAsync(long userId, string reason);
    Task NotifyReportProcessedAsync(long reporterId, long reportId, ReportStatus status);
    Task NotifyLoginAttemptAsync(long userId, string ipAddress);
    Task NotifyPasswordChangeAsync(long userId);
}

public class NotificationService : INotificationService
{
    private readonly UserManager<AppUser> _userManager;
    private readonly IEmailService _emailService;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(UserManager<AppUser> userManager, IEmailService emailService, ILogger<NotificationService> logger)
    {
        _userManager = userManager;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task NotifyUserBannedAsync(long userId, string reason)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user?.Email == null) return;

            var subject = "⚠️ Ваш акаунт OLX Clone забанено";
            var htmlBody = $@"
                <h2>Сповіщення про бан</h2>
                <p>Привіт, {user.UserName}!</p>
                <p>Ваш акаунт OLX Clone був забанено.</p>
                <p><strong>Причина:</strong> {reason}</p>
                <p>Якщо ви вважаєте, що це помилка, напишіть нам: support@olxclone.com</p>";

            await _emailService.SendEmailAsync(user.Email, subject, htmlBody);
            _logger.LogInformation($"Ban notification sent to {user.Email}");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error sending ban notification: {ex.Message}");
        }
    }

    public async Task NotifyReportProcessedAsync(long reporterId, long reportId, ReportStatus status)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(reporterId.ToString());
            if (user?.Email == null) return;

            var statusText = status == ReportStatus.Resolved ? "задоволена" : "відхилена";
            var subject = $"Скарга #{reportId} була {statusText}";
            var htmlBody = $@"
                <h2>Статус вашої скарги</h2>
                <p>Привіт, {user.UserName}!</p>
                <p>Ваша скарга #{reportId} була <strong>{statusText}</strong>.</p>
                <p>Дякуємо за повідомлення про порушення!</p>";

            await _emailService.SendEmailAsync(user.Email, subject, htmlBody);
            _logger.LogInformation($"Report notification sent to {user.Email}");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error sending report notification: {ex.Message}");
        }
    }

    public async Task NotifyLoginAttemptAsync(long userId, string ipAddress)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user?.Email == null) return;

            var subject = "🔐 Вхід в ваш акаунт OLX Clone";
            var htmlBody = $@"
                <h2>Сповіщення про вхід</h2>
                <p>Привіт, {user.UserName}!</p>
                <p>Ваш акаунт був доступний з IP: <strong>{ipAddress}</strong></p>
                <p>Якщо це були не ви, негайно змініть пароль!</p>";

            await _emailService.SendEmailAsync(user.Email, subject, htmlBody);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error sending login notification: {ex.Message}");
        }
    }

    public async Task NotifyPasswordChangeAsync(long userId)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user?.Email == null) return;

            var subject = "Пароль вашого акаунту змінено";
            var htmlBody = $@"
                <h2>Підтвердження зміни пароля</h2>
                <p>Привіт, {user.UserName}!</p>
                <p>Ваш пароль був успішно змінено.</p>
                <p>Якщо це були не ви, негайно зв'яжіться з нами!</p>";

            await _emailService.SendEmailAsync(user.Email, subject, htmlBody);
            _logger.LogInformation($"Password change notification sent to {user.Email}");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error sending password change notification: {ex.Message}");
        }
    }
}
