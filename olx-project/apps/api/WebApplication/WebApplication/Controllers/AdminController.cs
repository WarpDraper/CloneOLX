using AuthDomain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLibrary_BookKey.DTO.User;

namespace OnlineLibrary_BookKey.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;

        public AdminController(UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager)
        {
            _userManager = userManager;
            _roleManager = roleManager;
        }

        // 1. ОТРИМАТИ ВСІХ ЮЗЕРІВ (Для таблиці в адмінці)
        // GET: api/admin/users
        [HttpGet("users")]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetAllUsers()
        {
            var users = await _userManager.Users.ToListAsync();
            var userDtos = new List<UserDto>();

            foreach (var user in users)
            {
                var roles = await _userManager.GetRolesAsync(user);

                userDtos.Add(new UserDto
                {
                    Id = user.Id,
                    UserName = user.UserName,
                    Email = user.Email,
                    Roles = roles
                });
            }

            return Ok(userDtos);
        }

        // 2. ВИДАЛИТИ ЮЗЕРА (БАН)
        // DELETE: api/admin/users/{id}
        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound("Юзера не знайдено");

            if (User.Identity.Name == user.UserName)
                return BadRequest("Не можна видалити самого себе!");

            var result = await _userManager.DeleteAsync(user);

            if (result.Succeeded) return NoContent();

            return BadRequest("Помилка при видаленні");
        }

        // 3. ВИДАТИ РОЛЬ (Зробити адміном або розжалувати)
        // POST: api/admin/assign-role
        [HttpPost("assign-role")]
        public async Task<IActionResult> AssignRole(string userId, string roleName)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound("Юзера немає");

            var roleExists = await _roleManager.RoleExistsAsync(roleName);
            if (!roleExists) return BadRequest("Такої ролі не існує");

            // Додаємо роль
            var result = await _userManager.AddToRoleAsync(user, roleName);

            if (result.Succeeded) return Ok($"Роль {roleName} додано користувачу {user.UserName}");

            return BadRequest("Помилка додавання ролі");
        }

        // 4. СТАТИСТИКА (Dashboard)
        // GET: api/admin/stats
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var userCount = await _userManager.Users.CountAsync();
            // Тут ти можеш звернутися до BookService, щоб дізнатися кількість книг
            // Але поки що просто для прикладу:

            var stats = new
            {
                TotalUsers = userCount,
                ServerTime = DateTime.UtcNow,
                Message = "System is healthy"
            };

            return Ok(stats);
        }
    }
}
