using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Olx.BLL.Entities.AdminMessages;
using Olx.BLL.Entities.ChatEntities;
using Olx.BLL.Entities.NewPost;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Olx.BLL.Entities
{
    public class OlxUser : IdentityUser<int>
    {
        // Defense-in-depth: DTOs (OlxUserDto, OlxUserShortDto, ChatOlxUserDto, etc.) already
        // whitelist exposed fields and never map these, but IdentityUser's hash/stamp fields
        // are serializable by default. Overriding with [JsonIgnore] guarantees this entity can
        // never leak PasswordHash/SecurityStamp/ConcurrencyStamp even if it's ever accidentally
        // returned directly instead of through a DTO.
        [JsonIgnore]
        public override string? PasswordHash { get; set; }

        [JsonIgnore]
        public override string? SecurityStamp { get; set; }

        [JsonIgnore]
        public override string? ConcurrencyStamp { get; set; } = Guid.NewGuid().ToString();

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

        // "Individual" (Приватна особа) or "Business" (Бізнес) — OLX-required account type
        // declaration (Profile page -> "Виберіть тип облікового запису").
        [StringLength(20)]
        [Unicode(false)]
        public string AccountType { get; set; } = "Individual";

        [StringLength(36)]
        [Unicode(false)]
        public string? SettlementRef { get; set; }
        public Settlement? Settlement { get; set; }

        // Profile Settings -> "Subscribe to Newsletter / Updates" toggle (POST /api/Account/subscribe).
        public bool NewsletterSubscribed { get; set; } = false;

        // Never serializable: these are the raw, bearer-equivalent rotation tokens.
        [JsonIgnore]
        public ICollection<RefreshToken> RefreshTokens { get; set; } = new HashSet<RefreshToken>();
        public ICollection<Advert> Adverts { get; set; } = new HashSet<Advert>();
        public ICollection<Advert> FavoriteAdverts { get; set; } = new HashSet<Advert>();
        public ICollection<ChatMessage> ChatMessages { get; set; } = new HashSet<ChatMessage>();
        public ICollection<Chat> BuyChats { get; set; } = new HashSet<Chat>();
        public ICollection<Chat> SellChats { get; set; } = new HashSet<Chat>();
        public ICollection<AdminMessage> AdminMessages { get; set; } = new HashSet<AdminMessage>();

    }
}
