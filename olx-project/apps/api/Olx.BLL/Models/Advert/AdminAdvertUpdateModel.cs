namespace Olx.BLL.Models.Advert
{
    // PUT /api/admin/adverts/{id} — partial update: every field is optional, only supplied
    // ones are applied. Unlike AdvertController's own POST /Advert/update (owner-only, full
    // AdvertCreationModel), this bypasses the ownership check so an admin can edit any advert.
    public class AdminAdvertUpdateModel
    {
        public string? Title { get; init; }
        public string? Description { get; init; }
        public decimal? Price { get; init; }
        public int? CategoryId { get; init; }

        // "isActive" from the admin UI maps to Approved (visible/live) — kept as its own flag
        // rather than a synthetic bool so it composes with Blocked/Completed exactly like the
        // rest of the storefront already reads Advert.Approved.
        public bool? IsActive { get; init; }
        public bool? IsPromoted { get; init; }

        // Optional convenience alternative to setting Approved/Blocked/Completed individually —
        // one of "pending" | "active" | "sold" | "blocked" (same vocabulary AdminController's
        // GetProducts already computes). If provided, it wins over IsActive.
        public string? Status { get; init; }
    }
}
