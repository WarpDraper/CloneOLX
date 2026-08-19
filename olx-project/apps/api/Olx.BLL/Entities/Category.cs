using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Olx.BLL.Entities.FilterEntities;

namespace Olx.BLL.Entities
{
    [Table("tbl_Categories")]
    public class Category : BaseNamedEntity
    {
        [StringLength(100)]
        [Unicode(false)]
        public string? Image { get; set; }

        // Multilingual name overrides. `Name` (inherited from BaseNamedEntity) stays the
        // canonical/fallback value — these are only populated once an admin (or
        // ICategoryService.AutoTranslateAsync) has supplied a translation for that locale.
        [StringLength(150)]
        public string? NameUk { get; set; }
        [StringLength(150)]
        public string? NameEn { get; set; }

        [StringLength(150)]
        [Unicode(false)]
        public string? Slug { get; set; }

        // Admin-controlled display order within the same ParentId level (CategoriesPage drag
        // reorder). Lower sorts first; ties fall back to Id.
        public int SortOrder { get; set; } = 0;

        public int? ParentId { get; set; }
        public Category? Parent { get; set; }
        public ICollection<Category> Childs { get; set; } = new HashSet<Category>();
        public ICollection<Filter> Filters { get; set; } = new HashSet<Filter>();
        public ICollection<Advert> Adverts { get; set; } = new HashSet<Advert>();
    }
}
