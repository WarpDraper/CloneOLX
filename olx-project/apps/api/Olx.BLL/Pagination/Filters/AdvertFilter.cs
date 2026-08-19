using Microsoft.EntityFrameworkCore;
using Olx.BLL.DTOs.AdvertDtos;
using Olx.BLL.Pagination.Interfaces;

namespace Olx.BLL.Pagination.Filters
{
    public class AdvertFilter : IPaginationFilter<AdvertDto>
    {
        public decimal PriceFrom { get; init; }
        public decimal PriceTo { get; init; }
        public string? Search { get; init; }
        public bool? IsContractPrice { get; init; }
        public bool? Approved { get; init; }
        public bool? Blocked { get; init; }
        public bool? Completed { get; init; }
        public string? CategorySearch { get; init; }
        public string? PhoneSearch { get; init; }
        public string? EmailSearch { get; init; }
        public string? SettlementSearch { get; init; }
        public string? SettlementRef { get; init; }
        public string? RegionRef { get; init; }
        public string? AreaRef { get; init; }
        public IEnumerable<int>? CategoryIds { get; init; }
        public IEnumerable<IEnumerable<int>>? Filters { get; init; }
        public int? UserId { get; init; }
        public IQueryable<AdvertDto> FilterQuery(IQueryable<AdvertDto> query)
        {
            if (UserId.HasValue)
            {
                query = query.Where(x => x.UserId == UserId.Value);
            }

            if (CategoryIds is not null && CategoryIds.Any())
            {
                // `.Contains(x.CategoryId)` is the EF Core-idiomatic membership check — it
                // translates reliably to a SQL `IN (...)`. The previous `.Any(z => z == x.CategoryId)`
                // form is the one pattern in this file that deviates from that idiom and, depending on
                // how the outer AdvertDto queryable is projected/composed (ProjectTo + further Where),
                // could fail to combine into a valid IN clause and yield zero matches instead of the
                // expected adverts for the selected category (and its subcategories).
                var categoryIds = CategoryIds.ToList();
                query = query.Where(x => categoryIds.Contains(x.CategoryId));
            }

            if (Filters is not null && Filters.Any())
            {
                foreach (var filter in Filters) 
                {
                    query = query.Where(x => filter.Any(z => x.FilterValues.Any(y => y.Id == z)));
                }
            }

            if (PriceFrom > 0)
            {
                query = query.Where(x => x.Price >= PriceFrom);
            }

            if (PriceTo > PriceFrom)
            {
                query = query.Where(x => x.Price <= PriceTo);
            }
            if (!String.IsNullOrWhiteSpace(Search))
            {
                // Match title, description AND category name so a free-text search (header/hero
                // search bar, /search?q=...) finds adverts by any of the three, not just the title.
                //
                // Two layers, OR'd together:
                //  1. EF.Functions.ILike + wildcards — native Postgres ILIKE, same convention as
                //     NewPostService.SearchSettlementsAsync. Case-insensitive substring match,
                //     can use a trigram GIN/GIST index on these columns if one is ever added.
                //  2. EF.Functions.TrigramsAreWordSimilar (pg_trgm's `<%` word_similarity operator,
                //     extension enabled in AddPgTrgmExtension migration) — catches morphological
                //     variants that don't literally contain the query as a substring, e.g. a search
                //     for "цуцик" finding an advert titled "Цуценята" (shared root, different
                //     ending) by comparing trigram overlap against the best-matching substring of
                //     the title/description instead of requiring an exact substring hit.
                var term = Search.Trim();
                var likePattern = $"%{term}%";
                query = query.Where(x =>
                    EF.Functions.ILike(x.Title, likePattern) ||
                    EF.Functions.ILike(x.Description, likePattern) ||
                    EF.Functions.ILike(x.CategoryName, likePattern) ||
                    EF.Functions.TrigramsAreWordSimilar(term, x.Title) ||
                    EF.Functions.TrigramsAreWordSimilar(term, x.Description));
            }
            if (!String.IsNullOrWhiteSpace(CategorySearch))
            {
                query = query.Where(x => x.CategoryName.ToLower().Contains(CategorySearch.ToLower()));
            }
            if (!String.IsNullOrWhiteSpace(PhoneSearch))
            {
                query = query.Where(x => x.PhoneNumber.Contains(PhoneSearch));
            }
            if (!String.IsNullOrWhiteSpace(EmailSearch))
            {
                query = query.Where(x => x.ContactEmail.ToLower().Contains(EmailSearch.ToLower()));
            }
            if (!String.IsNullOrWhiteSpace(SettlementSearch))
            {
                query = query.Where(x => x.SettlementName.ToLower().Contains(SettlementSearch.ToLower()));
            }
            if (!String.IsNullOrWhiteSpace(SettlementRef))
            {
                query = query.Where(x => x.SettlementRef == SettlementRef);
            }
            if (!String.IsNullOrWhiteSpace(RegionRef))
            {
                query = query.Where(x => x.RegionRef == RegionRef);
            }
            if (!String.IsNullOrWhiteSpace(AreaRef))
            {
                query = query.Where(x => x.AreaRef == AreaRef);
            }
            if (IsContractPrice.HasValue)
            {
                query = query.Where(x => x.IsContractPrice == IsContractPrice);
            }
            if (Approved.HasValue)
            {
                query = query.Where(x => x.Approved == Approved);
            }
            if (Blocked.HasValue)
            {
                query = query.Where(x => x.Blocked == Blocked);
            }
            if (Completed.HasValue)
            {
                query = query.Where(x => x.Completed == Completed);
            }

            return query;
        }
    }
}
