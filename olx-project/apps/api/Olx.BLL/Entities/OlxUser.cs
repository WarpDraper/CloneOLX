using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Olx.BLL.Entities.AdminMessages;
using Olx.BLL.Entities.ChatEntities;
using Olx.BLL.Entities.NewPost;
using System.ComponentModel.DataAnnotations;

namespace Olx.BLL.Entities
{
    public class OlxUser : IdentityUser<int>
    {
        [StringLength(100)]
        public string? FirstName { get; set; }

        [StringLength(100)]
        public string? LastName { get; set; }

        [StringLength(100)]
        [Unicode(false)]
        public string? Photo { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        public DateTime LastActivity { get; set; } = DateTime.UtcNow;

        [StringLength(100)]
        [Unicode(false)]
        public string? WebSite { get; set; }
        [StringLength(4000)]
        public string? About { get; set; }

        public double Rating { get; set; } = 5.0;
        public int ReviewsCount { get; set; } = 0;

<<<<<<< HEAD
        // "Individual" (Приватна особа) or "Business" (Бізнес) — OLX-required account type
        // declaration (Profile page -> "Виберіть тип облікового запису").
        [StringLength(20)]
        [Unicode(false)]
        public string AccountType { get; set; } = "Individual";

=======
>>>>>>> origin/tobi-nazar
        [StringLength(36)]
        [Unicode(false)]
        public string? SettlementRef { get; set; }
        public Settlement? Settlement { get; set; }
        public ICollection<RefreshToken> RefreshTokens { get; set; } = new HashSet<RefreshToken>();
        public ICollection<Advert> Adverts { get; set; } = new HashSet<Advert>();
        public ICollection<Advert> FavoriteAdverts { get; set; } = new HashSet<Advert>();
        public ICollection<ChatMessage> ChatMessages { get; set; } = new HashSet<ChatMessage>();
        public ICollection<Chat> BuyChats { get; set; } = new HashSet<Chat>();
        public ICollection<Chat> SellChats { get; set; } = new HashSet<Chat>();
        public ICollection<AdminMessage> AdminMessages { get; set; } = new HashSet<AdminMessage>();

    }
}
