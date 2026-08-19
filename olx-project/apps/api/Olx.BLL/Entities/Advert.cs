using Microsoft.EntityFrameworkCore;
using Olx.BLL.Entities.ChatEntities;
using Olx.BLL.Entities.FilterEntities;
using Olx.BLL.Entities.NewPost;
using Pgvector;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Olx.BLL.Entities
{
    [Table("tbl_Adverts")]
    public class Advert : BaseEntity
    {
        public int UserId { get; set; }
        public OlxUser User { get; set; } = null!;
        [StringLength(19)]
        public string PhoneNumber { get; set; } = string.Empty;

        [StringLength(128)]
        [Unicode(false)]
        public string ContactEmail { get; set; } = string.Empty;
        [StringLength(128)]
        public string ContactPersone { get; set; } = string.Empty;
        public DateTime Date { get; set; } = DateTime.UtcNow;
        [StringLength(256)]
        public string Title { get; set; } = string.Empty;
        [StringLength(5000)]
        public string Description { get; set; } = string.Empty;
        public bool IsContractPrice { get; set; }
        public decimal Price { get; set; }
        public bool Approved { get; set; } = false;
        public bool Blocked { get; set; } = false;
        public bool Completed { get; set; } = false;

        // "Б/в" / "Нове" badge. None for categories where condition doesn't apply (e.g.
        // Тварини, Робота, Послуги) as well as "not specified".
        public ItemCondition Condition { get; set; } = ItemCondition.None;

        // Admin-controlled promotion (Admin > Products > "isPromoted"), distinct from the
        // deterministic `Id % 5 == 0` demo placement AdvertProfile also folds into AdvertDto.IsTop.
        public bool Promoted { get; set; } = false;

        [StringLength(36)]
        [Unicode(false)]
       
        public string SettlementRef { get; set; } = null!;
        public Settlement Settlement { get; set; } = null!;
        public int CategoryId { get; set; }
        public Category Category { get; set; } = null!;
        public ICollection<FilterValue> FilterValues { get; set; }  = new HashSet<FilterValue>();
        public ICollection<AdvertImage> Images { get; set; } = new HashSet<AdvertImage>();
        public ICollection<OlxUser> FavoritedByUsers { get; set; } = new HashSet<OlxUser>();
        public ICollection<Chat> Chats { get; set; } = new HashSet<Chat>();

        // pgvector embedding for semantic search (see IAdvertService.SearchSimilarAdvertsAsync).
        // 768 dimensions matches Google's text-embedding-004 model output; null until an
        // embedding has been generated/backfilled for this advert.
        [Column(TypeName = "vector(768)")]
        public Vector? Embedding { get; set; }
    }
}
