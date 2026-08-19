using Microsoft.Extensions.Diagnostics.HealthChecks;
using Olx.DAL.Data;

namespace OLX.API.HealthChecks
{
    /// <summary>
    /// Reports whether the primary Postgres database (Neon) is reachable. OlxDbContext is scoped,
    /// but that's safe to inject directly here: the health check pipeline (DefaultHealthCheckService)
    /// already creates a fresh DI scope for every /health run and resolves each IHealthCheck from
    /// it, so this gets its own per-check-run DbContext just like a controller would.
    /// </summary>
    public class PostgresHealthCheck(OlxDbContext db) : IHealthCheck
    {
        public async Task<HealthCheckResult> CheckHealthAsync(
            HealthCheckContext context,
            CancellationToken cancellationToken = default)
        {
            try
            {
                // Opens a real connection and closes it — confirms the DB (including a cold
                // Neon auto-suspend wake-up) is actually reachable, not just that DI resolved.
                return await db.Database.CanConnectAsync(cancellationToken)
                    ? HealthCheckResult.Healthy("PostgreSQL reachable.")
                    : HealthCheckResult.Unhealthy("PostgreSQL did not respond to a connection check.");
            }
            catch (Exception ex)
            {
                return HealthCheckResult.Unhealthy("PostgreSQL connection check threw an exception.", ex);
            }
        }
    }
}
