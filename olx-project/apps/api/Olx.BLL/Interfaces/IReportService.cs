using Olx.BLL.DTOs.ReportDtos;
using Olx.BLL.Models.Report;

namespace Olx.BLL.Interfaces
{
    public interface IReportService
    {
        // Reporter is resolved from the authenticated user (IHttpContextAccessor), not the body.
        Task<ReportDto> CreateAsync(ReportCreationModel model);

        Task<IEnumerable<ReportDto>> GetPendingAsync();

        Task ResolveAsync(int id, ReportResolutionModel model);
        Task RejectAsync(int id, ReportResolutionModel model);
    }
}
