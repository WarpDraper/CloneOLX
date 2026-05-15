using Domain;
using System.ComponentModel.DataAnnotations;

namespace BLL.DTO.Report;

public class ReportDto
{
    public long Id { get; set; }
    public long TargetUserId { get; set; }
    public string TargetUserName { get; set; }
    public ReportReason Reason { get; set; }
    public string Description { get; set; }
    public ReportStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
}
