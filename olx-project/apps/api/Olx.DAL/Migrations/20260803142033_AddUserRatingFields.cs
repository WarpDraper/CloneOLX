using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Olx.DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddUserRatingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Rating",
                table: "AspNetUsers",
                type: "double precision",
                nullable: false,
                defaultValue: 5.0);

            migrationBuilder.AddColumn<int>(
                name: "ReviewsCount",
                table: "AspNetUsers",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Rating",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ReviewsCount",
                table: "AspNetUsers");
        }
    }
}
