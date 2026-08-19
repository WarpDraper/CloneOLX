namespace Olx.BLL.Helpers
{
    /// <summary>Central place for FusionCache key naming, so read paths and their matching
    /// invalidation-on-write calls can't drift apart by using slightly different strings.</summary>
    public static class CacheKeys
    {
        public const string AllCategories = "categories:all";

        /// <summary>Full nested category tree (top-level + all descendants), as returned by
        /// <see cref="Olx.BLL.Services.CategoryService.GetAllTreeAsync"/> for the storefront
        /// mega-menu/category nav. Rebuilding this walks every Category row and recurses to
        /// build the nested Childs graph, which is heavier than the flat <see cref="AllCategories"/>
        /// projection — worth its own longer-lived (1h) cache entry.</summary>
        public const string CategoryTree = "category_tree";

        public static string CategoryById(int id) => $"category:{id}";

        public static string AdvertById(int id) => $"advert:{id}";
    }
}
