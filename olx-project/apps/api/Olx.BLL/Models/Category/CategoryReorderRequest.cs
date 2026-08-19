namespace Olx.BLL.Models.Category
{
    // POST /api/admin/categories/reorder — new SortOrder for a batch of category ids, all
    // scoped to the same ParentId level (CategoriesPage drag-and-drop reorder).
    public class CategoryReorderRequest
    {
        public IEnumerable<CategoryOrderItem> Items { get; init; } = [];
    }

    public class CategoryOrderItem
    {
        public int Id { get; init; }
        public int SortOrder { get; init; }
    }
}
