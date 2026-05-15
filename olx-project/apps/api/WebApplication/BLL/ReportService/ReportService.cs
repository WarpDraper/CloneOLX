using AutoMapper;
using BLL.AdminService;
using BLL.DTO.Authorize;
using BLL.DTO.Report;
using BLL.NotificationService;
using DAL.UnitOfWork;
using Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;

namespace BLL.ReportService;

public class ReportService : IReportService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly UserManager<AppUser> _userManager;
    private readonly IAdminService _adminService;
    private readonly INotificationService _notificationService;
    private readonly IMapper _mapper;
    private readonly ILogger<ReportService> _logger;

    public ReportService(
        IUnitOfWork unitOfWork,
        UserManager<AppUser> userManager,
        IAdminService adminService,
        INotificationService notificationService,
        IMapper mapper,
        ILogger<ReportService> logger)
    {
        _unitOfWork = unitOfWork;
        _userManager = userManager;
        _adminService = adminService;
        _notificationService = notificationService;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<AuthResultDto> CreateReportAsync(long reporterId, CreateReportDto dto)
    {
        try
        {
            // Перевірка: користувач не може скаржитися на себе
            if (reporterId == dto.TargetUserId)
                return AuthResultDto.Fail("Ви не можете скаржитися на себе");

            var targetUser = await _userManager.FindByIdAsync(dto.TargetUserId.ToString());
            if (targetUser == null)
                return AuthResultDto.Fail("Цільовий користувач не знайдений");

            // Перевірка: чи вже є скарга від цього юзера на цей профіль?
            var existingReports = await _unitOfWork.Reports.GetAsync(
                r => r.ReporterId == reporterId && 
                     r.TargetUserId == dto.TargetUserId && 
                     r.Status == ReportStatus.Pending);

            if (existingReports.Any())
                return AuthResultDto.Fail("Ви вже подали скаргу на цього користувача");

            var report = new Report
            {
                ReporterId = reporterId,
                TargetUserId = dto.TargetUserId,
                Reason = dto.Reason,
                Description = dto.Description,
                Status = ReportStatus.Pending
            };

            await _unitOfWork.Reports.AddAsync(report);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation($"Report #{report.Id} created by user {reporterId}");
            return AuthResultDto.Success($"Скарга #{report.Id} успішно подана");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error creating report: {ex.Message}");
            return AuthResultDto.Fail("Помилка створення скарги");
        }
    }

    public async Task<List<ReportDto>> GetPendingReportsAsync()
    {
        try
        {
            var reports = await _unitOfWork.Reports.GetPendingReportsAsync();
            return reports.Select(r => new ReportDto
            {
                Id = r.Id,
                TargetUserId = r.TargetUserId,
                TargetUserName = r.TargetUser?.UserName ?? "Unknown",
                Reason = r.Reason,
                Description = r.Description,
                Status = r.Status,
                CreatedAt = r.CreatedAt
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting pending reports: {ex.Message}");
            return new List<ReportDto>();
        }
    }

    public async Task<AuthResultDto> ResolveReportAsync(ResolveReportDto dto)
    {
        try
        {
            var report = await _unitOfWork.Reports.GetReportWithDetailsAsync(dto.ReportId);
            if (report == null)
                return AuthResultDto.Fail("Скарга не знайдена");

            report.Status = dto.Resolution;
            report.AdminNotes = dto.AdminNotes;
            report.ResolvedAt = DateTime.UtcNow;

            // Якщо потрібно забанити користувача
            if (dto.ShouldBanUser && dto.Resolution == ReportStatus.Resolved)
            {
                var targetUser = await _userManager.FindByIdAsync(report.TargetUserId.ToString());
                if (targetUser != null)
                {
                    await _adminService.BanUserAsync(targetUser.Id, dto.BanReason);
                    
                    // Сповіщення про бан
                    await _notificationService.NotifyUserBannedAsync(
                        targetUser.Id,
                        $"Ваш акаунт забанено через скаргу. Причина: {dto.BanReason}");
                }
            }

            _unitOfWork.Reports.Update(report);
            await _unitOfWork.SaveAsync();

            // Сповіщення про розгляд скарги
            await _notificationService.NotifyReportProcessedAsync(
                report.ReporterId,
                report.Id,
                dto.Resolution);

            _logger.LogInformation($"Report #{dto.ReportId} resolved");
            return AuthResultDto.Success("Скарга розглянута");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error resolving report: {ex.Message}");
            return AuthResultDto.Fail("Помилка розгляду скарги");
        }
    }

    public async Task<List<ReportDto>> GetUserReportsAsync(long userId)
    {
        try
        {
            var reports = await _unitOfWork.Reports.GetReportsByUserAsync(userId);
            return reports.Select(r => new ReportDto
            {
                Id = r.Id,
                TargetUserId = r.TargetUserId,
                TargetUserName = r.TargetUser?.UserName ?? "Unknown",
                Reason = r.Reason,
                Description = r.Description,
                Status = r.Status,
                CreatedAt = r.CreatedAt
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting user reports: {ex.Message}");
            return new List<ReportDto>();
        }
    }
}
