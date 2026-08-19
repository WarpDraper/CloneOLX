using FluentValidation;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Olx.BLL.DTOs.ReportDtos;
using Olx.BLL.Entities;
using Olx.BLL.Exceptions;
using Olx.BLL.Exstensions;
using Olx.BLL.Interfaces;
using Olx.BLL.Models.Advert;
using Olx.BLL.Models.Report;
using Olx.BLL.Models.User;
using Olx.BLL.Resources;
using System.Net;

namespace Olx.BLL.Services
{
    public class ReportService(
        IRepository<Report> reportRepository,
        IRepository<Advert> advertRepository,
        IValidator<ReportCreationModel> validator,
        UserManager<OlxUser> userManager,
        IHttpContextAccessor httpContext,
        IAccountService accountService,
        IAdvertService advertService) : IReportService
    {
        public async Task<ReportDto> CreateAsync(ReportCreationModel model)
        {
            var reporter = await userManager.UpdateUserActivityAsync(httpContext);
            validator.ValidateAndThrow(model);

            if (model.AdvertId.HasValue && !await advertRepository.AnyAsync(a => a.Id == model.AdvertId.Value))
            {
                throw new HttpException(Errors.InvalidAdvertId, HttpStatusCode.BadRequest);
            }

            if (model.TargetUserId.HasValue && await userManager.FindByIdAsync(model.TargetUserId.Value.ToString()) is null)
            {
                throw new HttpException(Errors.InvalidUserId, HttpStatusCode.BadRequest);
            }

            var report = new Report
            {
                ReporterId = reporter.Id,
                AdvertId = model.AdvertId,
                TargetUserId = model.TargetUserId,
                Reason = model.Reason,
                Description = model.Description,
                Status = ReportStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            await reportRepository.AddAsync(report);
            await reportRepository.SaveAsync();

            return await LoadDtoAsync(report.Id);
        }

        public async Task<IEnumerable<ReportDto>> GetPendingAsync()
        {
            var reports = await reportRepository.GetQuery()
                .Include(r => r.Reporter)
                .Include(r => r.TargetUser)
                .Include(r => r.Advert)
                .Where(r => r.Status == ReportStatus.Pending)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return reports.Select(MapToDto);
        }

        public async Task ResolveAsync(int id, ReportResolutionModel model) =>
            await CloseAsync(id, ReportStatus.Resolved, model);

        public async Task RejectAsync(int id, ReportResolutionModel model) =>
            await CloseAsync(id, ReportStatus.Rejected, model);

        private async Task CloseAsync(int id, ReportStatus newStatus, ReportResolutionModel model)
        {
            var admin = await userManager.UpdateUserActivityAsync(httpContext);

            var report = await reportRepository.GetQuery(QueryTrackingBehavior.TrackAll)
                .FirstOrDefaultAsync(r => r.Id == id)
                ?? throw new HttpException(Errors.InvalidReportId, HttpStatusCode.NotFound);

            if (report.Status != ReportStatus.Pending)
            {
                throw new HttpException(Errors.ReportAlreadyResolved, HttpStatusCode.BadRequest);
            }

            // Side effects run before the status flip so a failure here (e.g. the target advert
            // was already removed) leaves the report Pending instead of silently closing it.
            if (model.BanUser && report.TargetUserId.HasValue)
            {
                await accountService.BlockUserAsync(new UserBlockModel
                {
                    UserIds = [report.TargetUserId.Value],
                    Lock = true,
                    LockReason = $"Report #{report.Id}: {report.Reason}"
                });
            }

            if (model.UnpublishAdvert && report.AdvertId.HasValue)
            {
                await advertService.AdminUpdateAsync(report.AdvertId.Value, new AdminAdvertUpdateModel { Status = "blocked" });
            }

            report.Status = newStatus;
            report.ResolvedByUserId = admin.Id;
            report.ResolvedAt = DateTime.UtcNow;

            await reportRepository.SaveAsync();
        }

        private async Task<ReportDto> LoadDtoAsync(int id)
        {
            var report = await reportRepository.GetQuery()
                .Include(r => r.Reporter)
                .Include(r => r.TargetUser)
                .Include(r => r.Advert)
                .FirstOrDefaultAsync(r => r.Id == id)
                ?? throw new HttpException(Errors.InvalidReportId, HttpStatusCode.NotFound);

            return MapToDto(report);
        }

        private static ReportDto MapToDto(Report r) => new()
        {
            Id = r.Id,
            ReporterId = r.ReporterId,
            ReporterName = r.Reporter is not null ? $"{r.Reporter.FirstName} {r.Reporter.LastName}".Trim() : $"Користувач #{r.ReporterId}",
            ReporterEmail = r.Reporter?.Email ?? string.Empty,
            TargetType = r.AdvertId.HasValue ? "advert" : "user",
            TargetId = r.AdvertId ?? r.TargetUserId ?? 0,
            TargetLabel = r.AdvertId.HasValue
                ? (r.Advert?.Title ?? $"Оголошення #{r.AdvertId}")
                : (r.TargetUser is not null ? $"{r.TargetUser.FirstName} {r.TargetUser.LastName}".Trim() : $"Користувач #{r.TargetUserId}"),
            Reason = r.Reason,
            Description = r.Description,
            Status = r.Status.ToString(),
            CreatedAt = r.CreatedAt
        };
    }
}
