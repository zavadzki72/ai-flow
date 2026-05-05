using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Dummy.Infra.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DummyCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DummyCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DummyItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    Price = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DummyItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DummyItems_DummyCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "DummyCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DummyCategories_Code",
                table: "DummyCategories",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DummyCategories_Name",
                table: "DummyCategories",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_DummyCategories_Status",
                table: "DummyCategories",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_DummyItems_CategoryId",
                table: "DummyItems",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_DummyItems_Code",
                table: "DummyItems",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DummyItems_Priority",
                table: "DummyItems",
                column: "Priority");

            migrationBuilder.CreateIndex(
                name: "IX_DummyItems_Status",
                table: "DummyItems",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DummyItems");

            migrationBuilder.DropTable(
                name: "DummyCategories");
        }
    }
}
