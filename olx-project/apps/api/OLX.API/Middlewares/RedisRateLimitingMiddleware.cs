using Microsoft.Extensions.DependencyInjection;
using Olx.BLL.Helpers;
using StackExchange.Redis;

namespace OLX.API.Middlewares
{
    /// <summary>
    /// Distributed fixed-window rate limiter backed by the isolated LimiterRedis instance (kept
    /// separate from CacheRedis/SignalRRedis so a traffic spike here can't compete with
    /// FusionCache's L2 or the SignalR backplane for the same free-tier connection/eviction
    /// budget). Registered in Program.cs's pipeline instead of ASP.NET Core's built-in
    /// RateLimiter middleware only when ConnectionStrings:Redis:Limiter is configured — the
    /// built-in middleware (with an in-memory PartitionedRateLimiter) is used otherwise.
    ///
    /// Partitioned by client IP, one counter per (IP, window) pair using INCR + PEXPIRE-on-first-
    /// increment so a burst of concurrent requests can't each reset the window's TTL and keep it
    /// open forever.
    /// </summary>
    public class RedisRateLimitingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IConnectionMultiplexer? _redis;
        private readonly ILogger<RedisRateLimitingMiddleware> _logger;

        private const int PermitLimit = 100;
        private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

        private const string Script = @"
local count = redis.call('INCR', KEYS[1])
if count == 1 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return count";

        // UseMiddleware<T> constructs this type once at startup via ActivatorUtilities, resolving
        // each constructor parameter with serviceProvider.GetRequiredService(type) — it does not
        // honor [FromKeyedServices] the way controllers/minimal APIs/SignalR hubs do. Requesting
        // IConnectionMultiplexer directly here throws "Unable to resolve service for type
        // IConnectionMultiplexer" even though the LimiterRedis instance IS registered (as a keyed
        // singleton in OlxBLLServiceExtensions). Resolving it explicitly via IServiceProvider
        // sidesteps that limitation.
        public RedisRateLimitingMiddleware(
            RequestDelegate next,
            IServiceProvider serviceProvider,
            ILogger<RedisRateLimitingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
            _redis = serviceProvider.GetKeyedService<IConnectionMultiplexer>(RedisKeys.Limiter);

            if (_redis is null)
            {
                // Should only happen if this middleware is registered without LimiterRedis being
                // configured (Program.cs only wires it up when Redis:Limiter is set) — but fail
                // open rather than throw, since a missing rate limiter must never take the API down.
                _logger.LogWarning(
                    "LimiterRedis (key '{RedisKey}') is not registered; RedisRateLimitingMiddleware will pass every request through unthrottled.",
                    RedisKeys.Limiter);
            }
        }

        public async Task Invoke(HttpContext context)
        {
            // Fail OPEN: no multiplexer, or one that isn't currently connected, must never turn
            // into a site-wide outage or a request-blocking stall — skip the check and let the
            // request through instead of blocking all traffic on a missing/dead cache.
            if (_redis is null || !_redis.IsConnected)
            {
                await _next(context);
                return;
            }

            var partitionKey = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            // Bucketing by a coarse time window (rather than a sliding log) keeps this to one
            // Redis round trip per request instead of a ZSET scan/trim.
            var windowBucket = DateTimeOffset.UtcNow.ToUnixTimeSeconds() / (long)Window.TotalSeconds;
            var redisKey = (RedisKey)$"ratelimit:{partitionKey}:{windowBucket}";

            try
            {
                var count = (long)await _redis.GetDatabase().ScriptEvaluateAsync(
                    Script,
                    new[] { redisKey },
                    new RedisValue[] { (long)Window.TotalMilliseconds });

                if (count > PermitLimit)
                {
                    context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                    context.Response.Headers.RetryAfter = ((int)Window.TotalSeconds).ToString();
                    await context.Response.WriteAsync("Too many requests. Please try again later.");
                    return;
                }
            }
            catch (Exception ex)
            {
                // Fail OPEN: an unreachable LimiterRedis must never turn into a site-wide outage —
                // log and let the request through instead of blocking all traffic on a dead cache.
                // Mirrors FusionCache's fail-safe philosophy for CacheRedis.
                _logger.LogWarning(ex, "LimiterRedis unreachable; skipping rate limit check for this request.");
            }

            await _next(context);
        }
    }
}
