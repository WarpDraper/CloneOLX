using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Olx.BLL.Entities;
using System.Reflection;
using Microsoft.Extensions.Configuration;

namespace Olx.DAL.Data
{
    public class OlxDbContext(DbContextOptions<OlxDbContext> options,
        IConfiguration configuration) : IdentityDbContext<OlxUser, IdentityRole<int>, int>(options)
    {
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            var connectionString = ToNpgsqlConnectionString(configuration.GetConnectionString("DefaultConnection")!);

            // Enforced programmatically (not just via the appsettings connection string text)
            // so every environment gets these regardless of how DefaultConnection was set —
            // covers the NeonTech/Supabase-style cloud Postgres SASL auth timeout
            // (Npgsql.Internal.NpgsqlConnector.AuthenticateSASL "Timeout during reading
            // attempt"), which happens when the default ~15s connect window is too short for a
            // cold/auto-suspended remote instance to wake up and complete the handshake.
            var builder = new NpgsqlConnectionStringBuilder(connectionString)
            {
                Timeout = 30,
                CommandTimeout = 60,
                KeepAlive = 15,
            };

            // Only force SSL for remote/cloud hosts (NeonTech, Supabase, ...) — a plain local
            // Postgres (Host=localhost/127.0.0.1, used by DbSetings in some environments) usually
            // isn't configured for SSL at all, and forcing Require there would break local dev.
            var isLocalHost = builder.Host is "localhost" or "127.0.0.1" or null;
            if (!isLocalHost)
            {
                builder.SslMode = SslMode.Require;
            }

            optionsBuilder.UseNpgsql(builder.ConnectionString);
        }

        // Neon, Supabase, Render and Heroku all hand out credentials as a URI
        // (postgresql://user:pass@host/db?sslmode=require), but Npgsql only understands
        // keyword/value strings. Translate URIs so either format can be pasted into
        // ConnectionStrings__DefaultConnection without surprises.
        private static string ToNpgsqlConnectionString(string connectionString)
        {
            if (String.IsNullOrWhiteSpace(connectionString)
                || !(connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
                     || connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase)))
            {
                return connectionString;
            }

            var uri = new Uri(connectionString);
            var userInfo = uri.UserInfo.Split(':', 2);

            var builder = new NpgsqlConnectionStringBuilder
            {
                Host = uri.Host,
                Port = uri.IsDefaultPort ? 5432 : uri.Port,
                Database = uri.AbsolutePath.TrimStart('/'),
                Username = Uri.UnescapeDataString(userInfo[0]),
                Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : null,
            };

            return builder.ConnectionString;
        }
    }
}
