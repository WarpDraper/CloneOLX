using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Olx.BLL.Entities;
using Olx.BLL.Interfaces;
using Olx.DAL.Data;
using Olx.DAL.Repositories;

namespace Olx.DAL.Exstension
{
    public static class OlxDALServiceExtensions
    {
        public static void AddOlxDbContext(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddDbContext<OlxDbContext>();
            services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
            services.AddIdentity<OlxUser, IdentityRole<int>>(options =>
            {
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(Double.Parse(configuration["LockoutTimeSpanMinutes"]!)); // Тривалість блокування
                options.Lockout.MaxFailedAccessAttempts = int.Parse(configuration["MaxFailedAccessAttempts"]!); // Кількість спроб
                options.Lockout.AllowedForNewUsers = true; // Дозволити блокування нових користувачів
              
                options.Stores.MaxLengthForKeys = 128;
                options.Password.RequireDigit = false;
                options.Password.RequiredLength = 5;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequireUppercase = false;
                options.Password.RequireLowercase = false;
            })
               .AddDefaultTokenProviders()
               .AddEntityFrameworkStores<OlxDbContext>();
        }

        // Cloud Postgres (NeonTech/Supabase) instances can be auto-suspended and take several
        // seconds to wake up, which shows up as an Npgsql SASL-auth TimeoutException
        // ("Timeout during reading attempt") on the very first connection attempt at startup.
        // Retries the connectivity check with backoff before migrating, and never lets an
        // unreachable/slow DB crash the whole host — logs instead, so the API can still come up
        // (e.g. for local frontend dev against seed-fallback data) rather than failing to start.
        private const int MaxConnectRetries = 3;
        private static readonly TimeSpan[] RetryDelays = [TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(10)];

        public static void DataBaseMigrate(this WebApplication app)
        {
            using var scope = app.Services.CreateScope();
            var serviceProvider = scope.ServiceProvider;
            var context = serviceProvider.GetRequiredService<OlxDbContext>();

            var connected = false;
            for (var attempt = 1; attempt <= MaxConnectRetries && !connected; attempt++)
            {
                try
                {
                    connected = context.Database.CanConnect();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[DbMigrate] Connection attempt {attempt}/{MaxConnectRetries} failed: {ex.Message}");
                }

                if (!connected && attempt < MaxConnectRetries)
                {
                    Thread.Sleep(RetryDelays[attempt - 1]);
                }
            }

            if (!connected)
            {
                if (app.Environment.IsDevelopment())
                {
                    Console.WriteLine("WARNING: Could not connect to PostgreSQL. Running API in offline/seeding mode...");
                }
                else
                {
                    Console.WriteLine("[DbMigrate] Could not connect to PostgreSQL after retries — starting without applying migrations.");
                }
                return;
            }

            try
            {
                context.Database.Migrate();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DbMigrate] Migration failed: {ex.Message}\n{ex}");
            }
        }
    }
}
