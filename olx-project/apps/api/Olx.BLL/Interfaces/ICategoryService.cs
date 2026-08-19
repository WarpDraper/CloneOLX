using Olx.BLL.DTOs.CategoryDtos;
using Olx.BLL.Models.Category;
using Olx.BLL.Models.Page;

namespace Olx.BLL.Interfaces
{
    public interface ICategoryService
    {
        Task<CategoryDto> GetById(int id);
        Task<IEnumerable<CategoryDto>> Get();
        Task<PageResponse<CategoryDto>> GetPageAsync(CategoryPageRequest pageRequest);
        Task<IEnumerable<CategoryDto>> GetAllTreeAsync(bool filters = true);
        Task<CategoryDto> GetTreeAsync(int categoryId);
        Task<CategoryDto> CreateAsync(CategoryCreationModel creationModel);
        Task RemoveAsync(int id);
        Task RemoveTreeAsync(int id);
        Task<CategoryDto> EditAsync(CategoryCreationModel editModel);

        // Admin drag-and-drop reorder (CategoriesPage): bulk-updates SortOrder for a batch of
        // category ids in one call instead of one EditAsync round-trip per row.
        Task ReorderAsync(CategoryReorderRequest reorderRequest);
    }
}
