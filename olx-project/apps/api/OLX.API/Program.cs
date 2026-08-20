using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Caching.StackExchangeRedis;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Olx.BLL.Exstensions;
using Olx.BLL.Helpers;
using Olx.BLL.Hubs;
using Olx.DAL.Exstension;
using OLX.API.Extensions;
using OLX.API.HealthChecks;
using OLX.API.Middlewares;
using StackExchange.Redis;
using System.Threading.RateLimiting;
using ZiggyCreatures.Caching.Fusion;
using ZiggyCreatures.Caching.Fusion.Serialization.SystemTextJson;

// Точка входу API: налаштовує сервіси, middleware та запускає веб-додаток.
var builder = WebApplication.CreateBuilder(args);

// Kestrel's default MaxRequestBodySize (~28.6 MB) is comfortably above a single 10 MB image
// (FileTypes.MaxImageFileSizeBytes) but too tight for a multi-image advert/category upload once
// other form fields are counted. Raised in one place — kept in sync with the FormOptions
// multipart limit in AddOlxApiConfigurations.
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 60 * 1024 * 1024; // 60 MB
});

// Реєструємо підключення до бази даних, бізнес-логіку та API-специфічні сервіси.
builder.Services.AddOlxDbContext(builder.Configuration);
builder.Services.AddOlxBLLServices(builder.Configuration);
builder.Services.AddOlxApiConfigurations(builder.Configuration);
builder.Services.AddOlxHttpClients();

// --- FusionCache: L1 (in-process memory) + L2 (distributed Redis/Upstash) hybrid cache -------
// Replaces the previous plain AddStackExchangeRedisCache setup. Wired for graceful degradation:
// if Upstash is slow or unreachable, tight distributed-cache timeouts + a circuit breaker mean
// every read falls straight through to L1 and then to the database factory instead of the
// request hanging on a dead Redis connection or the app crashing on boot because Redis wasn't
// reachable yet.
builder.Services.AddMemoryCache();

var fusionCacheBuilder = builder.Services.AddFusionCache()
    .WithOptions(options =>
    {
        // Trip the breaker after repeated L2 failures so a dead/unreachable Redis gets *fewer*
        // requests thrown at it (giving it room to recover) instead of every single cache
        // operation eating a fresh connection/timeout hit.
        options.DistributedCacheCircuitBreakerDuration = TimeSpan.FromSeconds(5);
    })
    .WithDefaultEntryOptions(new FusionCacheEntryOptions
    {
        Duration = TimeSpan.FromMinutes(10),

        // Fail-safe: if the factory (the database query) throws, serve the last known-good
        // value — even if logically expired — instead of propagating the failure to the caller.
        IsFailSafeEnabled = true,
        FailSafeMaxDuration = TimeSpan.FromHours(8),
        FailSafeThrottleDuration = TimeSpan.FromSeconds(30),

        // Never let a slow/unreachable L2 add latency to a request: give it a tight timeout and
        // fall back to L1 (or the factory) instead of blocking on it. Background writes so a
        // save to Redis never blocks the response that triggered it.
        DistributedCacheSoftTimeout = TimeSpan.FromMilliseconds(800),
        DistributedCacheHardTimeout = TimeSpan.FromSeconds(2),
        AllowBackgroundDistributedCacheOperations = true,

        // Spreads out expirations across instances so they don't all miss L1 at the exact same
        // moment and hammer L2/the database simultaneously.
        JitterMaxDuration = TimeSpan.FromSeconds(10)
    });

// --- Multi-Redis architecture -----------------------------------------------------------------
// Redis workloads are split across 3 isolated providers (each free-tier Upstash instance has its
// own eviction/connection/command budget) so a spike on one workload can never starve another:
//   - CacheRedis   (ConnectionStrings:Redis:Cache)   -> FusionCache L2 (Categories, Adverts)
//   - SignalRRedis (ConnectionStrings:Redis:SignalR) -> SignalR backplane + presence tracking
//   - LimiterRedis (ConnectionStrings:Redis:Limiter) -> API rate limiting + advert view counters
// Every provider is optional and independently degrades to a single-instance, in-process
// equivalent when its connection string isn't configured — same philosophy across all three, so
// none of this ever turns an unreachable/unconfigured Redis into a startup crash.

// CacheRedis: optional distributed L2 for FusionCache. Without it, FusionCache still runs
// perfectly well as an L1-only (memory) cache — it just won't be shared across instances.
var cacheRedisConnectionString = builder.Configuration.GetConnectionString("Redis:Cache");
if (!string.IsNullOrWhiteSpace(cacheRedisConnectionString))
{
    fusionCacheBuilder
        .WithSerializer(new FusionCacheSystemTextJsonSerializer())
        .WithDistributedCache(new RedisCache(new RedisCacheOptions
        {
            // abortConnect=false (set on the connection string) is what makes an unreachable
            // Redis a slow/degraded L2 instead of a startup crash — StackExchange.Redis will
            // keep retrying in the background instead of throwing the moment it can't connect.
            Configuration = cacheRedisConnectionString
        }));

    // Separate keyed IConnectionMultiplexer purely for /health (see RedisConnectionHealthCheck)
    // — FusionCache/RedisCache above manages its own connection internally and doesn't expose it,
    // so there's nothing to reuse here. AddKeyedSingleton only connects lazily on first
    // resolution, so this costs nothing unless /health is actually hit.
    builder.Services.AddKeyedSingleton<IConnectionMultiplexer>(RedisKeys.Cache,
        (_, _) => ConnectionMultiplexer.Connect(cacheRedisConnectionString));
}
else
{
    Console.WriteLine("[FusionCache] No ConnectionStrings:Redis:Cache configured — running with an L1 (in-memory) cache only.");
}

// SignalRRedis: scale-out backplane for SignalR (MessageHub groups/Clients.All broadcasts stay
// in sync across every API instance) — also the store RedisConnectionTracker uses for presence
// (see OlxBLLServiceExtensions.AddOlxBLLServices). Without it, SignalR still works fine, just as
// a single-instance hub with in-memory presence (ConnectionTracker).
var signalRRedisConnectionString = builder.Configuration.GetConnectionString("Redis:SignalR");
var signalRBuilder = builder.Services.AddSignalR();
if (!string.IsNullOrWhiteSpace(signalRRedisConnectionString))
{
    // Parse the connection string explicitly (instead of relying on the
    // AddStackExchangeRedis(string, ...) overload to parse it internally) so the timeout/retry
    // options below are guaranteed to land on the exact ConfigurationOptions instance the
    // multiplexer connects with.
    var redisConfig = ConfigurationOptions.Parse(signalRRedisConnectionString);

    // Same reasoning as abortConnect=False on CacheRedis above: keep retrying in the background
    // instead of throwing if SignalRRedis isn't reachable yet at boot. Set explicitly here (not
    // just relying on abortConnect=False in the connection string) so startup is resilient even
    // if the string is ever changed without that flag.
    redisConfig.AbortOnConnectFail = false;
    // Give the initial TLS/auth handshake enough room on a cold/free-tier endpoint instead of the
    // previous 5s/10s timeouts tripping during a slow connect and logging "Not connected to
    // Redis" — connects keep retrying in the background either way (AbortOnConnectFail).
    redisConfig.ConnectTimeout = 15000;
    // Default SyncTimeout (5s) was tight enough that commands issued while the multiplexer was
    // still finishing a cold handshake could time out and surface as "Not connected to Redis" in
    // RedisHubLifetimeManager even though the connection eventually succeeded.
    redisConfig.SyncTimeout = 15000;
    // Namespaces the pub/sub channels this app uses so a shared free-tier Redis instance could
    // theoretically be reused by another app without channel collisions.
    redisConfig.ChannelPrefix = RedisChannel.Literal("olx-signalr");

    signalRBuilder.AddStackExchangeRedis(options =>
    {
        options.Configuration = redisConfig;
    });
}
else
{
    Console.WriteLine("[SignalR] No ConnectionStrings:Redis:SignalR configured — running single-instance (no backplane).");
}

// LimiterRedis: backs both the distributed rate limiter and the advert view counters (the view
// counter registration is in AddOlxBLLServices, keyed off the same connection string). When
// configured, rate limiting runs as RedisRateLimitingMiddleware (registered in the pipeline
// below) instead of ASP.NET Core's built-in RateLimiter middleware, since the built-in
// PartitionedRateLimiter has no first-party Redis-backed store — only the in-memory fallback
// below needs it.
var limiterRedisConnectionString = builder.Configuration.GetConnectionString("Redis:Limiter");
if (string.IsNullOrWhiteSpace(limiterRedisConnectionString))
{
    // Fallback: built-in in-memory fixed-window limiter, partitioned per client IP. Not shared
    // across instances, but keeps the API protected even without LimiterRedis configured.
    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 100,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0
                }));
    });
    Console.WriteLine("[RateLimiter] No ConnectionStrings:Redis:Limiter configured — using an in-memory (per-instance) limiter.");
}

// Додаємо Swagger та API explorer для документування (AddSignalR already called above, as part
// of the SignalRRedis backplane wiring).
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Logging.AddConsole();

// /health: one place to see whether Postgres and each of the 3 Redis providers are actually up,
// instead of finding out from a 500 or from "Not connected to Redis" log spam. Every Redis check
// reports Degraded (not Unhealthy) when its provider is unreachable, matching this app's existing
// fail-open philosophy — a down Redis provider never takes the API itself down, so it shouldn't
// flip the whole health check to Unhealthy either.
builder.Services.AddHealthChecks()
    .AddCheck<PostgresHealthCheck>("postgres", tags: ["db"])
    .AddTypeActivatedCheck<RedisConnectionHealthCheck>("redis-cache", args: [RedisKeys.Cache, "Cache"])
    .AddTypeActivatedCheck<RedisConnectionHealthCheck>("redis-signalr", args: [RedisKeys.SignalR, "SignalR"])
    .AddTypeActivatedCheck<RedisConnectionHealthCheck>("redis-limiter", args: [RedisKeys.Limiter, "Limiter"]);

// Render (and most PaaS proxies) terminate TLS at the edge and forward plain HTTP to the
// container, passing the original scheme/host in X-Forwarded-*. Without this the app thinks
// every request is http://, which breaks Secure cookies and absolute URL generation.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // The proxy is Render's, not in a known subnet — clearing these is required for the
    // headers to be honoured at all.
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});


var app = builder.Build();

app.UseForwardedHeaders();

// HTTPS redirect is handled by Render's edge; enabling it in-container behind the proxy is a
// no-op at best. It's also disabled in Development because a 307 redirect on a CORS preflight
// (OPTIONS) request is treated by browsers as a hard failure ("Redirect is not allowed for a
// preflight request"), which breaks every cross-origin call from the local Vite dev server.
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}


app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

// Swagger/Swagger UI expose the full API surface (routes, DTOs, auth scheme) and must never be
// reachable in production — restricted to Development only. Static files/cultures stay enabled
// in every environment.
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "OLX API v1");
    c.RoutePrefix = "swagger";
});
app.AddStaticFiles();
app.AddCultures();

app.UseRouting();

// CORS must run after UseRouting and before UseAuthentication/UseAuthorization/endpoint
// execution: it needs endpoint metadata (for per-endpoint policies) resolved by routing first,
// and it must short-circuit preflight OPTIONS requests before auth or rate limiting ever see
// them — otherwise a 401/429 (instead of the CORS-approved response) can be what the browser
// sees for the preflight, which it also treats as a failed check.
app.UseCors("AllowFrontend");

// LimiterRedis-backed distributed rate limiting when configured; otherwise the in-memory
// PartitionedRateLimiter registered above via AddRateLimiter. Placed after UseRouting (so
// RedisRateLimitingMiddleware isn't wasted on requests that won't match an endpoint anyway) and
// before authentication, so throttling doesn't pay the cost of running the JWT/identity pipeline.
if (!string.IsNullOrWhiteSpace(limiterRedisConnectionString))
{
    app.UseMiddleware<RedisRateLimitingMiddleware>();
}
else
{
    app.UseRateLimiter();
}

app.UseAuthentication();
app.UseAuthorization();
app.SetMaxRequestBodySize();

// Мапимо SignalR-хаб і контролери, а потім застосовуємо міграції та seed-дані.
app.MapHub<MessageHub>("/hub");
app.MapControllers();

// No [Authorize] here deliberately — uptime monitors/load balancers hitting this need to do so
// without a JWT. It only ever reports connectivity status text, never secrets/connection strings.
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = async (httpContext, report) =>
    {
        httpContext.Response.ContentType = "application/json";
        var payload = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                description = e.Value.Description
            })
        };
        await httpContext.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(payload));
    }
});

app.DataBaseMigrate();

// Seeding failures must never take down the host — log and continue so the API stays
// reachable (e.g. with a partially/un-seeded DB) instead of the whole process crashing on boot.
try
{
    await app.SeedDataAsync();
}
catch (Exception ex)
{
    Console.WriteLine($"[DbSeeder] Seeding failed, continuing startup without complete seed data: {ex}");
}

await app.RunAsync();
