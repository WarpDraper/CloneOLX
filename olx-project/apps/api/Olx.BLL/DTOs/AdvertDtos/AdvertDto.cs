using Olx.BLL.DTOs.FilterDtos;
using Olx.BLL.DTOs.OlxUserDtos;

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
        public ICollection<FilterValueDto> FilterValues { get; set; } = new HashSet<FilterValueDto>();
        public ICollection<AdvertImageDto> Images { get; set; } = new HashSet<AdvertImageDto>();
    }
}
