using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Olx.BLL.Entities;
using Olx.BLL.Helpers.Options;
using Pgvector.EntityFrameworkCore;
using System.Reflection;
using Microsoft.Extensions.Configuration;

namespace Olx.DAL.Data
{
    public class OlxDbContext(DbContextOptions<OlxDbContext> options,
        IConfiguration configuration) : IdentityDbContext<OlxUser, IdentityRole<int>, int>(options)
    {
        public DbSet<Notification> Notifications => Set<Notification>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            // Required for the Advert.Embedding vector(768) column (pgvector semantic search,
            // see IAdvertService.SearchSimilarAdvertsAsync) — creates the Postgres "vector"
            // extension via migration if it isn't already enabled on the database.
            modelBuilder.HasPostgresExtension("vector");
            // Required for EF.Functions.TrigramsAreWordSimilar/TrigramsSimilarity (fuzzy advert
            // search, see AdvertFilter.FilterQuery) — creates the Postgres "pg_trgm" extension via
            // migration if it isn't already enabled on the database, same pattern as "vector" above.
            modelBuilder.HasPostgresExtension("pg_trgm");
            modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            var rawConnectionString = configuration.GetConnectionString("DefaultConnection");

            // ConnectionStrings:DefaultConnection is the primary source. If it isn't mapped
            // (missing/blank — e.g. an environment that only sets the discrete DbSettings
            // block or its DbSettings__* env var equivalents), fall back to assembling an
            // equivalent connection string from DbSettings (Server/Port/Database/UserId/
            // Password) via NpgsqlConnectionStringBuilder, so a DefaultConnection-less
            // environment doesn't fail to start.
            if (string.IsNullOrWhiteSpace(rawConnectionString))
            {
                var dbSettings = configuration.GetSection(nameof(DbSettings)).Get<DbSettings>();
                if (dbSettings is not null && !string.IsNullOrWhiteSpace(dbSettings.Server))
                {
                    var fallbackBuilder = new NpgsqlConnectionStringBuilder
                    {
                        Host = dbSettings.Server,
                        Database = dbSettings.Database,
                        Username = dbSettings.UserId,
                        Password = dbSettings.Password
                    };
                    if (int.TryParse(dbSettings.Port, out var fallbackPort))
                    {
                        fallbackBuilder.Port = fallbackPort;
                    }
                    rawConnectionString = fallbackBuilder.ConnectionString;
                }
            }

            if (string.IsNullOrWhiteSpace(rawConnectionString))
            {
                throw new InvalidOperationException(
                    "No database connection configured. Set ConnectionStrings:DefaultConnection or the DbSettings section (Server/Port/Database/UserId/Password).");
            }

            var connectionString = ToNpgsqlConnectionString(rawConnectionString);

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
            // Postgres (Host=localhost/127.0.0.1, used by DbSettings in some environments) usually
            // isn't configured for SSL at all, and forcing Require there would break local dev.
            var isLocalHost = builder.Host is "localhost" or "127.0.0.1" or null;
            if (!isLocalHost)
            {
                builder.SslMode = SslMode.Require;
            }

            // Retries transient Npgsql failures (dropped connections, cloud-provider failover,
            // the same cold-start blips DataBaseMigrate already retries around) with exponential
            // backoff instead of surfacing a raw exception from the first query that hits them.
            optionsBuilder.UseNpgsql(builder.ConnectionString, npgsqlOptions =>
            {
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 5,
                    maxRetryDelay: TimeSpan.FromSeconds(10),
                    errorCodesToAdd: null);

                // Registers the pgvector "vector" CLR type mapping (Pgvector.Vector) on this
                // connection so Advert.Embedding and EF.Functions/CosineDistance-style LINQ
                // translations work.
                npgsqlOptions.UseVector();

                // Global split-query behavior — silences EF warning [20504] on queries that load
                // more than one collection navigation (e.g. Advert.Images + Advert.Values +
                // Advert.Filters) and avoids the cartesian-explosion cost of a single JOIN query.
                // Queries that need atomicity/consistency across collections in one snapshot can
                // still opt back into AsSingleQuery() per-query.
                npgsqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
            });
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
