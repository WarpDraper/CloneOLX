using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using Olx.DAL.Data;

#nullable disable

namespace Olx.DAL.Migrations
{
    // NOTE: hand-written (no `dotnet ef` tooling available in the environment this was authored
    // in). [DbContext]/[Migration] are on this same partial class instead of a separate
    // "*.Designer.cs" — Up()/Down() below are what Database.Migrate() actually executes at
    // startup, so table creation works regardless. What's intentionally NOT included is a
    // BuildTargetModel() override (normally generated into the Designer.cs, mirroring the
    // ENTIRE database's current model — used by `dotnet ef migrations add` to diff the next
    // migration and by EF's opt-in "pending model changes" check, not by Migrate() itself).
    // Recommended follow-up: run `dotnet ef migrations add SyncOrderModel` once locally so EF
    // regenerates accurate Designer.cs/OlxDbContextModelSnapshot.cs entries for tbl_Orders and
    // tbl_OrderItems (it will detect Order/OrderItem already exist and produce a no-op Up()).
    [DbContext(typeof(OlxDbContext))]
    [Migration("20260804090000_AddOrderEntity")]
    public partial class AddOrderEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tbl_Orders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeliveryType = table.Column<int>(type: "integer", nullable: false),
                    PaymentMethod = table.Column<int>(type: "integer", nullable: false),
                    SettlementRef = table.Column<string>(type: "text", nullable: true),
                    SettlementDescription = table.Column<string>(type: "text", nullable: true),
                    WarehouseRef = table.Column<string>(type: "text", nullable: true),
                    WarehouseDescription = table.Column<string>(type: "text", nullable: true),
                    Address = table.Column<string>(type: "text", nullable: true),
                    RecipientName = table.Column<string>(type: "text", nullable: false),
                    RecipientPhone = table.Column<string>(type: "text", nullable: false),
                    TotalPrice = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_Orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tbl_Orders_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tbl_OrderItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrderId = table.Column<int>(type: "integer", nullable: false),
                    AdvertId = table.Column<int>(type: "integer", nullable: true),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Price = table.Column<decimal>(type: "numeric", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_OrderItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tbl_OrderItems_tbl_Adverts_AdvertId",
                        column: x => x.AdvertId,
                        principalTable: "tbl_Adverts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_tbl_OrderItems_tbl_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "tbl_Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tbl_Orders_UserId",
                table: "tbl_Orders",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_OrderItems_AdvertId",
                table: "tbl_OrderItems",
                column: "AdvertId");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_OrderItems_OrderId",
                table: "tbl_OrderItems",
                column: "OrderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "tbl_OrderItems");
            migrationBuilder.DropTable(name: "tbl_Orders");
        }
    }
}
