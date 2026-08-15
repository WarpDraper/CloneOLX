using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Olx.DAL.Data;

#nullable disable

namespace Olx.DAL.Migrations
{
    // NOTE: hand-written (same pattern as 20260804090000_AddOrderEntity / 20260811000000_
    // CleanStaleWebpImageReferences — no `dotnet ef` tooling available in the environment this
    // was authored in). [DbContext]/[Migration] are on this same partial class instead of a
    // separate "*.Designer.cs" — Up()/Down() below are what Database.Migrate() actually executes
    // at startup (see OlxDALServiceExtensions.DataBaseMigrate() -> Program.cs), so the column
    // gets created regardless. OlxDbContextModelSnapshot.cs is updated by hand alongside this
    // file so `dotnet ef migrations add` still produces a no-op diff next time it's run locally.
    [DbContext(typeof(OlxDbContext))]
    [Migration("20260815120000_AddUserNewsletterSubscription")]
    public partial class AddUserNewsletterSubscription : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "NewsletterSubscribed",
                table: "AspNetUsers",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NewsletterSubscribed",
                table: "AspNetUsers");
        }
    }
}
