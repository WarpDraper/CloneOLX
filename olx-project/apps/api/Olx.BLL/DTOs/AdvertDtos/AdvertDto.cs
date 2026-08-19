using Olx.BLL.DTOs.FilterDtos;
using Olx.BLL.DTOs.OlxUserDtos;
using Olx.BLL.Entities;

namespace Olx.BLL.DTOs.AdvertDtos
{
    public class AdvertDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public OlxUserShortDto? User { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public string ContactEmail { get; set; } = string.Empty;
        public string ContactPersone { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool IsContractPrice { get; set; }
        public decimal Price { get; set; }
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public bool Approved { get; set; } = false;
        public bool Blocked { get; set; } = false;
        public bool Completed { get; set; } = false;
        public ItemCondition Condition { get; set; } = ItemCondition.None;
        public string SettlementName { get; set; } = string.Empty;
        public string SettlementRef { get; set; } = string.Empty;
        public string RegionRef { get; set; } = string.Empty;
        public string AreaRef { get; set; } = string.Empty;
        // Premium/"ТОП" placement flag. Computed (Id % 5 == 0, see AdvertProfile) rather than a
        // persisted column — a deterministic ~1-in-5 spread across every advert, with no schema
        // migration required, that the feed-composition logic (frontend) uses to place a
        // premium-badged card after every 4-5 regular ones.
        public bool IsTop { get; set; }
        // Popularity signal (favorited-by count) used by the "За популярністю" sort option.
        public int FavoritesCount { get; set; }
        // Fast, Redis-backed hit counter (LimiterRedis) — not persisted to the DB, see
        // IAdvertViewCounterService. Only ever set on the GetByIdAsync (detail page) path; every
        // other AdvertDto-returning method leaves this at its default (0).
        public long ViewCount { get; set; }
        public ICollection<FilterValueDto> FilterValues { get; set; } = new HashSet<FilterValueDto>();
        public ICollection<AdvertImageDto> Images { get; set; } = new HashSet<AdvertImageDto>();

        /// <summary>
        /// Shallow copy of this DTO with its own copy of <see cref="User"/>. When an instance
        /// comes back from ICacheService it may be the same in-process object handed to every
        /// concurrent caller for that key (the memory cache layer stores references, not
        /// copies), so mutating it in place — e.g. OnlineStatusExtensions.WithOnlineStatus
        /// stamping live presence — would leak into other requests reading the same cached
        /// entry. Cloning first keeps that mutation request-local.
        /// </summary>
        public AdvertDto CloneForPresenceStamping()
        {
            var clone = (AdvertDto)MemberwiseClone();
            if (User is not null)
            {
                clone.User = User.ShallowCopy();
            }
            return clone;
        }
    }
}
