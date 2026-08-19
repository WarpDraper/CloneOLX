using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Olx.DAL.Data;

#nullable disable

namespace Olx.DAL.Migrations
{
    // NOTE: hand-written (no `dotnet ef` tooling available in the environment this was authored
    // in) — same approach as 20260804090000_AddOrderEntity. [DbContext]/[Migration] live on this
    // same partial class instead of a separate "*.Designer.cs"; Up()/Down() below are what
    // Database.Migrate() actually executes at startup, so the column gets added regardless. No
    // BuildTargetModel() override is included (see AddOrderEntity's comment for why that's safe).
    // Recommended follow-up: run `dotnet ef migrations add SyncAdvertConditionModel` once locally
    // so EF regenerates accurate Designer.cs/OlxDbContextModelSnapshot.cs entries (it will detect
    // Advert.Condition already exists and produce a no-op Up()).
    [DbContext(typeof(OlxDbContext))]
    [Migration("20260819190000_AddAdvertCondition")]
    public partial class AddAdvertCondition : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Condition",
                table: "tbl_Adverts",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Condition",
                table: "tbl_Adverts");
        }
    }
}
