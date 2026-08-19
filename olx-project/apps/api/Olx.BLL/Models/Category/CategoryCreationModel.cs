using Microsoft.AspNetCore.Http;

namespace Olx.BLL.Models.Category
{
    public class CategoryCreationModel
    {
        public int Id { get; init; }
        public string Name { get; init; } = string.Empty;
        public string? NameUk { get; init; }
        public string? NameEn { get; init; }
        public string? Slug { get; init; }
        public IFormFile? ImageFile { get; init; }
        public string? CurrentImage { get; init; }
        public int? ParentId { get; init; }
        public IEnumerable<int>? FilterIds { get; init; }
    }
}
