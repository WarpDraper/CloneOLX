using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Olx.BLL.Entities;
using Olx.BLL.Exceptions;
using Olx.BLL.Interfaces;
using System.Net;

namespace OLX.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class NotificationController(
        INotificationService notificationService,
        UserManager<OlxUser> userManager) : ControllerBase
    {
        // GET /api/Notification?page=1&pageSize=20 — paginated feed for the /notifications page.
        [HttpGet]
        public async Task<IActionResult> GetMyNotifications([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var userId = await GetCurrentUserIdAsync();
            return Ok(await notificationService.GetMyNotificationsAsync(userId, page, pageSize));
        }

        // GET /api/Notification/top-unread?count=3 — header bell dropdown: top N unread + total unread count.
        [HttpGet("top-unread")]
        public async Task<IActionResult> GetTopUnread([FromQuery] int count = 3)
        {
            var userId = await GetCurrentUserIdAsync();
            return Ok(await notificationService.GetTopUnreadNotificationsAsync(userId, count));
        }

        // GET /api/Notification/unread-count — bare badge count.
        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var userId = await GetCurrentUserIdAsync();
            return Ok(await notificationService.GetUnreadCountAsync(userId));
        }

        // PUT /api/Notification/{id}/read
        [HttpPut("{id:int}/read")]
        public async Task<IActionResult> MarkAsRead([FromRoute] int id)
        {
            var userId = await GetCurrentUserIdAsync();
            await notificationService.MarkAsReadAsync(id, userId);
            return Ok();
        }

        // PUT /api/Notification/read-all
        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = await GetCurrentUserIdAsync();
            await notificationService.MarkAllAsReadAsync(userId);
            return Ok();
        }

        // Resolves the caller's user id straight off the JWT's NameIdentifier claim instead of
        // round-tripping through UserManager.GetUserAsync (which internally calls
        // ConvertIdFromString and throws FormatException on a non-numeric claim, plus a
        // NullReferenceException downstream if the account behind an otherwise-valid token was
        // deleted). Both of those are unhandled-exception paths that GlobalExceptionHandlerMiddleware
        // turns into a bare 500 — this endpoint is hit on every page load via the header bell, so a
        // stale/malformed token must fail as a clean 401, not a 500.
        private Task<int> GetCurrentUserIdAsync()
        {
            var idClaim = userManager.GetUserId(User);
            if (string.IsNullOrEmpty(idClaim) || !int.TryParse(idClaim, out var userId))
            {
                throw new HttpException("Unable to resolve the authenticated user. Please sign in again.", HttpStatusCode.Unauthorized);
            }

            return Task.FromResult(userId);
        }
    }
}
