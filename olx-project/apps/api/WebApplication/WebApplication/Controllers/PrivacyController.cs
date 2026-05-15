using BLL.DTO.Authorize;
using BLL.PrivacyService;
using Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace WebApplication.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PrivacyController : ControllerBase
{
    private readonly IPrivacyService _privacyService;
    private readonly ILogger<PrivacyController> _logger;

    public PrivacyController(IPrivacyService privacyService, ILogger<PrivacyController> logger)
    {
        _privacyService = privacyService;
        _logger = logger;
    }

    /// <summary>
    /// Оновити налаштування приватності користувача
    /// </summary>
    [HttpPost("update")]
    [Authorize]
    public async Task<IActionResult> UpdatePrivacySettings([FromBody] PrivacySettingsDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out long userId))
            return Unauthorized();

        _logger.LogInformation($"User {userId} updating privacy settings");

        var result = await _privacyService.UpdatePrivacySettingsAsync(userId, dto);

        if (!result.IsSuccess)
            return BadRequest(new { Message = result.Message });

        return Ok(new { Message = result.Message });
    }

    /// <summary>
    /// Отримати налаштування приватності користувача
    /// </summary>
    [HttpGet("settings")]
    [Authorize]
    public async Task<IActionResult> GetPrivacySettings()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out long userId))
            return Unauthorized();

        var settings = await _privacyService.GetPrivacySettingsAsync(userId);

        if (settings == null)
            return NotFound(new { Message = "Налаштування не знайдено" });

        return Ok(settings);
    }

    /// <summary>
    /// Отримати публічний профіль користувача (з урахуванням приватності)
    /// </summary>
    [HttpGet("profile/{userId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicProfile(long userId)
    {
        var profile = await _privacyService.GetPublicProfileAsync(userId);

        if (profile == null)
            return NotFound(new { Message = "Користувача не знайдено" });

        return Ok(profile);
    }
}
