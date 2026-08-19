using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Olx.BLL.Interfaces;
using Olx.BLL.Models.Ai;

namespace OLX.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    // AI-допоміжні ендпоінти для форми створення оголошення (кнопка "✨ Заповнити з AI").
    public class AIController(IAiService aiService) : ControllerBase
    {
        // Генерує пропоновану категорію та опис оголошення на основі короткого заголовка,
        // використовуючи Google Gemini. Потребує авторизації — так само, як і саме створення
        // оголошення (AdvertController.Create).
        [Authorize]
        [HttpPost("generate-advert")]
        public async Task<IActionResult> GenerateAdvert([FromBody] GenerateAdvertRequest request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return BadRequest("Title is required.");
            }

            var result = await aiService.GenerateAdvertContentAsync(request.Title.Trim(), cancellationToken);
            return Ok(result);
        }
    }
}
