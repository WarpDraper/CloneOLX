using Domain;
using System.Linq.Expressions;

namespace DAL.Repository;

    public interface IReportRepository
    {
        Task AddAsync(Report entity);
        Task<Report> GetByIdAsync(long id);
        Task<List<Report>> GetAsync(Expression<Func<Report, bool>> predicate);
        Task<List<Report>> GetPendingReportsAsync();
        Task<List<Report>> GetReportsByUserAsync(long userId);
        Task<Report> GetReportWithDetailsAsync(long reportId);
        void Update(Report entity);
        Task SaveAsync();
    }
