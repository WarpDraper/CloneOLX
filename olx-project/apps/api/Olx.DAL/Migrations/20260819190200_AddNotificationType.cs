using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Olx.DAL.Data;

#nullable disable

namespace Olx.DAL.Migrations
{
    // NOTE: hand-written (no `dotnet ef` tooling available in the environment this was authored
    // in) — same approach as 20260804090000_AddOrderEntity / 20260819190000_AddAdvertCondition /
    // 20260819190100_AddUserBalance.
    // Recommended follow-up: run `dotnet ef migrations add SyncNotificationTypeModel` once locally
    // so EF regenerates accurate Designer.cs/OlxDbContextModelSnapshot.cs entries.
    [DbContext(typeof(OlxDbContext))]
    [Migration("20260819190200_AddNotificationType")]
    public partial class AddNotificationType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "tbl_Notifications",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Type",
                table: "tbl_Notifications");
        }
    }
}
