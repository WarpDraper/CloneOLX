using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Olx.DAL.Data;

#nullable disable

namespace Olx.DAL.Migrations
{
    // NOTE: hand-written (no `dotnet ef` tooling available in the environment this was authored
    // in) — same approach as 20260804090000_AddOrderEntity / 20260819190000_AddAdvertCondition.
    // Recommended follow-up: run `dotnet ef migrations add SyncUserBalanceModel` once locally so
    // EF regenerates accurate Designer.cs/OlxDbContextModelSnapshot.cs entries.
    [DbContext(typeof(OlxDbContext))]
    [Migration("20260819190100_AddUserBalance")]
    public partial class AddUserBalance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Balance",
                table: "AspNetUsers",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Balance",
                table: "AspNetUsers");
        }
    }
}
