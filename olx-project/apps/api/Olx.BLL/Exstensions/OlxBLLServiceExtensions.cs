using FluentValidation;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NETCore.MailKit.Extensions;
using NETCore.MailKit.Infrastructure.Internal;
using Olx.BLL.Exceptions;
using Olx.BLL.Helpers;
using Olx.BLL.Helpers.Options;
using Olx.BLL.Interfaces;
using Olx.BLL.Resources;
using Olx.BLL.Services;
using Olx.BLL.Services.BackgroundServices;
using StackExchange.Redis;
using System.Net;


namespace Olx.BLL.Exstensions
{
    public static class OlxBLLServiceExtensions
    {
        public static void AddOlxBLLServices(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddAutoMapper(cfg => cfg.AddMaps(typeof(AccountService).Assembly));
            services.AddValidatorsFromAssemblyContaining<AccountService>();
            // IFusionCache itself is registered as a singleton by AddFusionCache() in Program.cs
            // (that's where L1/L2/Redis are configured); CacheService just wraps it behind
            // ICacheService, so it's a singleton too.
            services.AddSingleton<ICacheService, CacheService>();
            services.AddScoped<IImageService, ImageService>();
            services.AddScoped<IJwtService, JwtService>();
            services.AddScoped<IAccountService, AccountService>();
            services.AddScoped<IFilterValueService, FilterValueService>();
            services.AddScoped<IFilterService, FilterService>();
            services.AddScoped<ICategoryService, CategoryService>();
            services.AddScoped<IAdvertService, AdvertService>();
            services.AddScoped<IOrderService, OrderService>();
            services.AddScoped<IChatService, ChatService>();
            services.AddScoped<IUserService, UserService>();
            services.AddScoped<IAdminMessageService, AdminMessageService>();
            services.AddScoped<IReportService, ReportService>();
            services.AddScoped<INotificationService, NotificationService>();
            services.AddScoped<IAdvertImageService, AdvertImageService>();
            services.AddScoped<INewPostService, NewPostService>();
            services.AddScoped<IBackupDataService, BackupDataService>();
            services.AddScoped<IAiService, GeminiAiService>();

            // Binds the "Gemini" configuration section onto GeminiOptions (ApiKey/Model/ApiUrl),
            // resolved by GeminiAiService via IOptions<GeminiOptions>. Falls back to the legacy
            // flat "GeminiApiKey" key for ApiKey when "Gemini:ApiKey" isn't set, so existing
            // user-secrets/environment-variable setups (see SECRETS.md) keep working unchanged —
            // both flow through the same IConfiguration, so User Secrets / env vars are picked up
            // for either key shape automatically. Model/ApiUrl fall back to their built-in
            // defaults if left blank/unset.
            services.AddOptions<GeminiOptions>()
                .Configure(options =>
                {
                    configuration.GetSection(GeminiOptions.SectionName).Bind(options);

                    if (string.IsNullOrWhiteSpace(options.ApiKey))
                    {
                        options.ApiKey = configuration["GeminiApiKey"] ?? string.Empty;
                    }

                    if (string.IsNullOrWhiteSpace(options.Model))
                    {
                        options.Model = GeminiOptions.DefaultModel;
                    }

                    if (string.IsNullOrWhiteSpace(options.ApiUrl))
                    {
                        options.ApiUrl = GeminiOptions.DefaultApiUrl;
                    }
                });

            // --- Multi-Redis architecture: SignalRRedis and LimiterRedis ---------------------
            // Two more isolated Redis providers alongside CacheRedis (wired directly in
            // Program.cs for FusionCache's L2). Each gets its own IConnectionMultiplexer,
            // registered as a *keyed* singleton so nothing accidentally shares a connection pool
            // across providers, with graceful degradation to an in-process fallback when a
            // provider's connection string isn't configured — same "never crash on boot because
            // Redis isn't reachable yet" philosophy as CacheRedis/FusionCache.

            // SignalRRedis: backplane connection string is consumed separately in Program.cs
            // (AddStackExchangeRedis needs it directly); here it only decides which
            // IConnectionTracker implementation backs presence.
            var signalRRedisConnectionString = configuration.GetConnectionString("Redis:SignalR");
            if (!string.IsNullOrWhiteSpace(signalRRedisConnectionString))
            {
                services.AddKeyedSingleton<IConnectionMultiplexer>(RedisKeys.SignalR,
                    (_, _) => ConnectionMultiplexer.Connect(signalRRedisConnectionString));
                // Singleton, not scoped: presence must be shared by every Hub instance/request,
                // not re-created per DI scope. See RedisConnectionTracker's doc comment.
                services.AddSingleton<IConnectionTracker, RedisConnectionTracker>();
            }
            else
            {
                services.AddSingleton<IConnectionTracker, ConnectionTracker>();
            }

            // LimiterRedis: shared by API rate limiting (RedisRateLimitingMiddleware in OLX.API)
            // and fast advert view counters, kept off CacheRedis/SignalRRedis so a request-rate
            // spike can't starve either of those.
            var limiterRedisConnectionString = configuration.GetConnectionString("Redis:Limiter");
            if (!string.IsNullOrWhiteSpace(limiterRedisConnectionString))
            {
                services.AddKeyedSingleton<IConnectionMultiplexer>(RedisKeys.Limiter,
                    (_, _) => ConnectionMultiplexer.Connect(limiterRedisConnectionString));
                services.AddSingleton<IAdvertViewCounterService, RedisAdvertViewCounterService>();
            }
            else
            {
                services.AddSingleton<IAdvertViewCounterService, InMemoryAdvertViewCounterService>();
            }

            services.AddHostedService<TokenCleanupService>();
            // ImageCeanupService intentionally NOT registered: it deleted AdvertImage files in the
            // background, which mutated product images outside of explicit user/seeder actions.
            // Product images must only ever come from explicit uploads or the JSON seeder fixtures.
            services.AddHostedService<AdminMesssageCleanupService>();

            services.AddMailKit(optionBuilder =>
            {
                var settings = configuration.GetSection(nameof(MailSettings)).Get<MailSettings>()
                    ?? throw new HttpException(Errors.JwtSettingsReadError, HttpStatusCode.InternalServerError);

                optionBuilder.UseMailKit(new MailKitOptions()
                {
                    Server = settings.Server,
                    Port = settings.Port,
                    SenderName = settings.SenderName,
                    SenderEmail = settings.SenderEmail,
                    Account = settings.Account,
                    Password = settings.Password,
                    Security = true
                });
            });
        }
    }
}
