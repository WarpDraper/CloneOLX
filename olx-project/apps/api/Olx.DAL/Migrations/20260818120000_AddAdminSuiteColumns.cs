using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Olx.DAL.Data;

#nullable disable

namespace Olx.DAL.Migrations
{
    // NOTE: hand-written (same pattern as 20260815120000_AddUserNewsletterSubscription — no
    // `dotnet ef` tooling available in the environment this was authored in). Adds the columns
    // introduced by the Admin Suite / Localization / Telegram Auth change (Category.NameUk/
    // NameEn/Slug/SortOrder, Advert.Promoted, OlxUser.TelegramId) that were added to the C#
    // entities without a matching migration — which is exactly why POST /api/Account/login (and
    // anything else touching AspNetUsers/tbl_Categories/tbl_Adverts) started throwing a Npgsql
    // "42703: column ... does not exist" once those entity changes shipped: EF still projects
    // every mapped property into its generated SQL regardless of whether the DB column exists.
    // [DbContext]/[Migration] are on this same partial class instead of a separate
    // "*.Designer.cs" — Up()/Down() below are what Database.Migrate() actually executes at
    // startup (see OlxDALServiceExtensions.DataBaseMigrate() -> Program.cs), so the columns get
    // created regardless. OlxDbContextModelSnapshot.cs is updated by hand alongside this file so
    // `dotnet ef migrations add` still produces a no-op diff next time it's run locally.
    [DbContext(typeof(OlxDbContext))]
    [Migration("20260818120000_AddAdminSuiteColumns")]
    public partial class AddAdminSuiteColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TelegramId",
                table: "AspNetUsers",
                type: "character varying(32)",
                maxLength: 32,
                unicode: false,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NameEn",
                table: "tbl_Categories",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NameUk",
                table: "tbl_Categories",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Slug",
                table: "tbl_Categories",
                type: "character varying(150)",
                maxLength: 150,
                unicode: false,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "tbl_Categories",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "Promoted",
                table: "tbl_Adverts",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TelegramId",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "NameEn",
                table: "tbl_Categories");

            migrationBuilder.DropColumn(
                name: "NameUk",
                table: "tbl_Categories");

            migrationBuilder.DropColumn(
                name: "Slug",
                table: "tbl_Categories");

            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "tbl_Categories");

            migrationBuilder.DropColumn(
                name: "Promoted",
                table: "tbl_Adverts");
        }
    }
}
