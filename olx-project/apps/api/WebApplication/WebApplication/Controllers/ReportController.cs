using BLL.DTO.Authorize;
using BLL.DTO.Report;
using BLL.ReportService;
using Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace WebApplication.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportController : ControllerBase
{
    private readonly IReportService _reportService;
    private readonly ILogger<ReportController> _logger;

    public ReportController(IReportService reportService, ILogger<ReportController> logger)
    {
        _reportService = reportService;
        _logger = logger;
    }

    /// <summary>
    /// Подати скаргу на користувача
    /// </summary>
    [HttpPost("create")]
    [Authorize]
    public async Task<IActionResult> CreateReport([FromBody] CreateReportDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out long reporterId))
            return Unauthorized();

        _logger.LogInformation($"User {reporterId} creating report for user {dto.TargetUserId}");

        var result = await _reportService.CreateReportAsync(reporterId, dto);

        if (!result.IsSuccess)
            return BadRequest(new { Message = result.Message });

        return Ok(new { Message = result.Message });
    }

    /// <summary>
    /// Отримати всі очікуючи скарги (тільки для адмінів)
    /// </summary>
    [HttpGet("pending")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetPendingReports()
    {
        _logger.LogInformation("Admin requesting pending reports");

        var reports = await _reportService.GetPendingReportsAsync();

        return Ok(reports);
    }

    /// <summary>
    /// Розглянути та розглянути скаргу (тільки для адмінів)
    /// </summary>
    [HttpPost("resolve")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ResolveReport([FromBody] ResolveReportDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        _logger.LogInformation($"Admin resolving report #{dto.ReportId}");

        var result = await _reportService.ResolveReportAsync(dto);

        if (!result.IsSuccess)
            return BadRequest(new { Message = result.Message });

        return Ok(new { Message = result.Message });
    }

    /// <summary>
    /// Отримати скарги поточного користувача
    /// </summary>
    [HttpGet("my-reports")]
    [Authorize]
    public async Task<IActionResult> GetMyReports()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out long userId))
            return Unauthorized();

        var reports = await _reportService.GetUserReportsAsync(userId);

        return Ok(reports);
    }
}
