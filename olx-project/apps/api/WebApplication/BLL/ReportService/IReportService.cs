
using BLL.DTO.Authorize;
using BLL.DTO.Report;


public interface IReportService
{
    Task<AuthResultDto> CreateReportAsync(long reporterId, CreateReportDto dto);
    Task<List<ReportDto>> GetPendingReportsAsync();
    Task<AuthResultDto> ResolveReportAsync(ResolveReportDto dto);
    Task<List<ReportDto>> GetUserReportsAsync(long userId);
}