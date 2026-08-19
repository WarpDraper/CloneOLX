using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace OLX.API.Controllers
{
    // Публічні, нечутливі налаштування застосунку, потрібні фронтенду під час рендеру
    // (наприклад, цільове посилання для QR-коду в футері/на головній). Значення читаються
    // напряму з appsettings.json — жодних секретів тут бути не може, оскільки ендпоінт
    // анонімний за задумом.
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous]
    public class SettingsController(IConfiguration configuration) : ControllerBase
    {
        // GET /api/Settings/qr-code-url — URL, на який має вести QR-код у футері та на головній
        // сторінці. Керується через appsettings.json:QrCodeTargetUrl, без перезбірки фронтенду.
        [HttpGet("qr-code-url")]
        public IActionResult GetQrCodeUrl()
        {
            var url = configuration["QrCodeTargetUrl"];
            if (string.IsNullOrWhiteSpace(url))
            {
                url = "https://example.com";
            }
            return Ok(new { url });
        }
    }
}
