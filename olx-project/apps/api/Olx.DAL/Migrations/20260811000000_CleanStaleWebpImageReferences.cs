using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Olx.DAL.Data;

#nullable disable

namespace Olx.DAL.Migrations
{
    // NOTE: hand-written (same pattern as 20260804090000_AddOrderEntity — no `dotnet ef` tooling
    // for a data migration). Applied automatically at startup via OlxDALServiceExtensions.DataBaseMigrate()
    // → context.Database.Migrate() (Program.cs → app.DataBaseMigrate()).
    //
    // Why this migration exists:
    // The old ImageService created five WebP size variants per source image (100_/200_/400_/800_/1200_)
    // and persisted names like "800_kwyuvlpa.tbj.webp" into tbl_AdvertImages.Name. After the service was
    // changed to store originals as "{random}.jpg" (no size variants), every physical *.webp file was
    // removed from disk — but DB rows still reference those deleted files, so buildImageUrl now points
    // the frontend at URLs that 404, and FallbackImage renders "Немає фото" instead of the advert photo.
    //
    // SQL cannot recreate the deleted *.webp bytes, so this migration only REMOVES the stale references
    // (the rows pointing at files that no longer exist). Restoring the actual demo photos is done by
    // re-seeding adverts once (Seeder:ForceReseedAdverts=true), which regenerates fresh "{random}.jpg"
    // files and rewrites the names — see Up() comments.
    [DbContext(typeof(OlxDbContext))]
    [Migration("20260811000000_CleanStaleWebpImageReferences")]
    public partial class CleanStaleWebpImageReferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Drop every AdvertImage row whose Name matches the old "{size}_{random}.webp" scheme
            //    (e.g. "100_0033yp0b.l2b.webp", "800_kwyuvlpa.tbj.webp"). The WHERE guard makes the
            //    migration idempotent — a second run finds nothing and is a no-op. Any new-format
            //    "{random}.jpg" names (or hand-edited images) are untouched.
            migrationBuilder.Sql("""
                DELETE FROM "tbl_AdvertImages"
                WHERE "Name" ~ '^[0-9]+_.*[.]webp$';
                """);
        }

        /// <inheritdoc />
        // Data cleanup — nothing to roll back (the physical files are gone regardless).
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
