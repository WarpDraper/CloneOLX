using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using Olx.DAL.Data;

#nullable disable

namespace Olx.DAL.Migrations
{
    // NOTE: hand-written (same pattern as 20260804090000_AddOrderEntity — no `dotnet ef` tooling
    // available in the environment this was authored in). Creates tbl_Reports, backing the new
    // Report entity/ReportController (POST /api/Report, GET /api/Report/pending,
    // PUT /api/Report/{id}/resolve|reject). [DbContext]/[Migration] are on this same partial
    // class instead of a separate "*.Designer.cs" — Up()/Down() below are what
    // Database.Migrate() actually executes at startup (see
    // OlxDALServiceExtensions.DataBaseMigrate() -> Program.cs), so the table gets created
    // regardless. OlxDbContextModelSnapshot.cs intentionally NOT updated by hand here (same
    // choice AddOrderEntity made) — it's only consumed by `dotnet ef migrations add`, not by
    // Migrate(); recommended follow-up: run `dotnet ef migrations add SyncReportModel` once
    // locally so EF regenerates an accurate snapshot (it will detect tbl_Reports already exists
    // and produce a no-op Up()).
    [DbContext(typeof(OlxDbContext))]
    [Migration("20260818130000_AddReportEntity")]
    public partial class AddReportEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tbl_Reports",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ReporterId = table.Column<int>(type: "integer", nullable: false),
                    TargetUserId = table.Column<int>(type: "integer", nullable: true),
                    AdvertId = table.Column<int>(type: "integer", nullable: true),
                    Reason = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ResolvedByUserId = table.Column<int>(type: "integer", nullable: true),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_Reports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tbl_Reports_AspNetUsers_ReporterId",
                        column: x => x.ReporterId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tbl_Reports_AspNetUsers_TargetUserId",
                        column: x => x.TargetUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_tbl_Reports_AspNetUsers_ResolvedByUserId",
                        column: x => x.ResolvedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_tbl_Reports_tbl_Adverts_AdvertId",
                        column: x => x.AdvertId,
                        principalTable: "tbl_Adverts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tbl_Reports_ReporterId",
                table: "tbl_Reports",
                column: "ReporterId");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_Reports_TargetUserId",
                table: "tbl_Reports",
                column: "TargetUserId");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_Reports_AdvertId",
                table: "tbl_Reports",
                column: "AdvertId");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_Reports_ResolvedByUserId",
                table: "tbl_Reports",
                column: "ResolvedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_Reports_Status",
                table: "tbl_Reports",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "tbl_Reports");
        }
    }
}
