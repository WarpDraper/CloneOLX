using Microsoft.Extensions.Diagnostics.HealthChecks;
using StackExchange.Redis;

namespace OLX.API.HealthChecks
{
    /// <summary>
    /// Reports the connection status of one of the app's keyed Redis providers (Cache, SignalR,
    /// Limiter — see Olx.BLL.Helpers.RedisKeys). Registered once per provider via
    /// AddTypeActivatedCheck(name, args: [redisKey, providerName]).
    ///
    /// Every Redis provider in this app already degrades gracefully to an in-process fallback
    /// when it's unreachable (FusionCache's fail-safe for Cache, single-instance SignalR, the
    /// in-memory rate limiter) — a down Redis here is a "running degraded, please look at this"
    /// signal for monitoring, not a request-facing outage. So this reports Degraded rather than
    /// Unhealthy when a configured provider isn't currently connected, and Healthy (not
    /// Unhealthy) when a provider simply isn't configured for this environment at all.
    ///
    /// Resolved via IServiceProvider.GetKeyedService rather than a constructor parameter because
    /// the Redis key differs per registration and can't be expressed as a single compile-time
    /// [FromKeyedServices] attribute across three registrations of the same class.
    /// </summary>
    public class RedisConnectionHealthCheck(IServiceProvider serviceProvider, string redisKey, string providerName) : IHealthCheck
    {
        public Task<HealthCheckResult> CheckHealthAsync(
            HealthCheckContext context,
            CancellationToken cancellationToken = default)
        {
            var multiplexer = serviceProvider.GetKeyedService<IConnectionMultiplexer>(redisKey);

            if (multiplexer is null)
            {
                return Task.FromResult(HealthCheckResult.Healthy(
                    $"{providerName}Redis is not configured for this environment; running on its in-process fallback."));
            }

            return Task.FromResult(multiplexer.IsConnected
                ? HealthCheckResult.Healthy($"{providerName}Redis connected.")
                : HealthCheckResult.Degraded(
                    $"{providerName}Redis is configured but not currently connected; requests are falling back to the in-process path."));
        }
    }
}
