namespace Domain;

public class Report
{
    public long Id { get; set; }
    
    public long ReporterId { get; set; }
    public AppUser Reporter { get; set; }
    
    public long TargetUserId { get; set; }
    public AppUser TargetUser { get; set; }
    
    public ReportReason Reason { get; set; }
    
    public string Description { get; set; }
    
    public ReportStatus Status { get; set; } = ReportStatus.Pending;
    
    public string? AdminNotes { get; set; }
    public long? ResolvedByAdminId { get; set; }
    public AppUser? ResolvedByAdmin { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}
