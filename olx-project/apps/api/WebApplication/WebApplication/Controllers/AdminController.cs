using BLL.AdminService;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OLXCLONE.DTO.User;
using System.Security.Claims;

namespace WebApplication.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")] // Тільки для еліти 
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;
        private readonly ILogger<AdminController> _logger;

        public AdminController(IAdminService adminService, ILogger<AdminController> logger)
        {
            _adminService = adminService;
            _logger = logger;
        }

        // 1. Отримати всіх користувачів
        [HttpGet("users")]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetAllUsers()
        {
            _logger.LogInformation("Адмін запитав список усіх користувачів");
            var users = await _adminService.GetAllUsersAsync();
            return Ok(users);
        }

        // 2. Отримати конкретного юзера по ID
        [HttpGet("users/{id}")]
        public async Task<IActionResult> GetUserById(long id)
        {
            var user = await _adminService.GetUserByIdAsync(id);
            if (user == null) return NotFound(new { Message = "Користувача не знайдено" });

            return Ok(user);
        }

        // 3. Забанити юзера (Твоя спеціалізація: Безпека)
        [HttpPost("users/{id}/ban")]
        public async Task<IActionResult> BanUser(long id, [FromBody] string reason)
        {
            var currentUserIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!long.TryParse(currentUserIdClaim, out var currentUserId))
            {
                _logger.LogWarning("Не вдалося визначити поточного користувача при спробі бану");
                return Forbid();
            }

            if (currentUserId == id) return BadRequest("Не можна забанити самого себе!");

            var success = await _adminService.BanUserAsync(id, reason);
            if (!success) return BadRequest("Не вдалося забанити користувача");

            _logger.LogWarning("Користувача {Id} було забанено. Причина: {Reason}", id, reason);
            return Ok(new { Message = "Користувача успішно забанено" });
        }

        // 4. Розбанити
        [HttpPost("users/{id}/unban")]
        public async Task<IActionResult> UnbanUser(long id)
        {
            var result = await _adminService.UnbanUserAsync(id);
            if (!result) return BadRequest("Не вдалося розблокувати користувача");

            return Ok(new { Message = "Користувача успішно розблоковано" });
        }

        // 5. Призначити адміном
        [HttpPost("users/{id}/make-admin")]
        public async Task<IActionResult> MakeAdmin(long id)
        {
            var result = await _adminService.AddAdminRoleAsync(id);
            if (!result) return BadRequest("Помилка при призначенні ролі");

            return Ok(new { Message = "Користувач тепер адмін" });
        }

        // 6. Повне видалення (Тільки для критичних випадків)
        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(long id)
        {
            var result = await _adminService.DeleteUserAsync(id);
            if (!result) return BadRequest("Помилка при видаленні користувача");

            return NoContent();
        }
    }
}