using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Olx.DAL.Data;

#nullable disable

namespace Olx.DAL.Migrations
{
    // NOTE: hand-written (no `dotnet ef` tooling available in the environment this was authored
    // in) — same approach as 20260804090000_AddOrderEntity / 20260819190000_AddAdvertCondition /
    // 20260819190100_AddUserBalance / 20260819190200_AddNotificationType. The AlterDatabase()
    // annotation shape below mirrors 20260816114029_AddAdvertEmbeddingAndVectorExtension (the
    // existing, dotnet-ef-generated migration that enabled the "vector" extension the same way).
    // Recommended follow-up: run `dotnet ef migrations add SyncPgTrgmModel` once locally so EF
    // regenerates accurate Designer.cs entries.
    [DbContext(typeof(OlxDbContext))]
    [Migration("20260819190300_AddPgTrgmExtension")]
    public partial class AddPgTrgmExtension : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:pg_trgm", ",,");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:PostgresExtension:pg_trgm", ",,");
        }
    }
}
