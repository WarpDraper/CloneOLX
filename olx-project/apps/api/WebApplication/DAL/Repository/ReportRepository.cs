using DAL.Context;
using Domain;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace DAL.Repository;



public class ReportRepository : IReportRepository
{
    private readonly ApplicationContext _context;

    public ReportRepository(ApplicationContext context)
    {
        _context = context;
    }

    public async Task AddAsync(Report entity)
    {
        await _context.Reports.AddAsync(entity);
    }

    public async Task<Report> GetByIdAsync(long id)
    {
        return await _context.Reports
            .Include(r => r.Reporter)
            .Include(r => r.TargetUser)
            .Include(r => r.ResolvedByAdmin)
            .FirstOrDefaultAsync(r => r.Id == id);
    }

    public async Task<List<Report>> GetAsync(Expression<Func<Report, bool>> predicate)
    {
        return await _context.Reports
            .Include(r => r.Reporter)
            .Include(r => r.TargetUser)
            .Where(predicate)
            .ToListAsync();
    }

    public async Task<List<Report>> GetPendingReportsAsync()
    {
        return await _context.Reports
            .Include(r => r.Reporter)
            .Include(r => r.TargetUser)
            .Where(r => r.Status == ReportStatus.Pending)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    public async Task<List<Report>> GetReportsByUserAsync(long userId)
    {
        return await _context.Reports
            .Include(r => r.TargetUser)
            .Where(r => r.ReporterId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    public async Task<Report> GetReportWithDetailsAsync(long reportId)
    {
        return await _context.Reports
            .Include(r => r.Reporter)
            .Include(r => r.TargetUser)
            .Include(r => r.ResolvedByAdmin)
            .FirstOrDefaultAsync(r => r.Id == reportId);
    }

    public void Update(Report entity)
    {
        _context.Reports.Update(entity);
    }

    public async Task SaveAsync()
    {
        await _context.SaveChangesAsync();
    }
}
