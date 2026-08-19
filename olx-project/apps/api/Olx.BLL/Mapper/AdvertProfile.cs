using AutoMapper;
using Olx.BLL.DTOs.AdvertDtos;
using Olx.BLL.Entities;
using Olx.BLL.Models.Advert;

namespace Olx.BLL.Mapper
{
    public class AdvertProfile :Profile
    {
        public AdvertProfile()
        {
            CreateMap<AdvertCreationModel,Advert>();
            CreateMap<Advert, ShortAdvertDto>()
                .ForMember(x => x.Image, opt => opt.MapFrom(z => z.Images.FirstOrDefault(y => y.Priority == 0) != null ? z.Images.First(y => y.Priority == 0).Name : string.Empty));
            CreateMap<Advert, AdvertDto>()
                // Explicit (rather than relying on AutoMapper's by-name collection convention)
                // so the cover-photo ordering (Priority ascending, same rule ShortAdvertDto's
                // single-Image mapping below uses) is guaranteed at the DB projection level too,
                // not just re-derived client-side (AdvertCard/RecommendationCard/AdvertListItem
                // all re-sort by priority anyway, but list/search/recommendation responses should
                // already come back in a sane order).
                .ForMember(x => x.Images, opt => opt.MapFrom(x => x.Images.OrderBy(i => i.Priority)))
                .ForMember(x => x.SettlementName, opt => opt.MapFrom(x => x.Settlement.Description))
                .ForMember(x => x.SettlementRef, opt => opt.MapFrom(x => x.Settlement.Ref))
                .ForMember(x => x.RegionRef, opt => opt.MapFrom(x => x.Settlement.Region))
                .ForMember(x => x.AreaRef, opt => opt.MapFrom(x => x.Settlement.SettlementRegion != null ? x.Settlement.SettlementRegion.AreaRef : string.Empty))
                .ForMember(x => x.CategoryName, opt => opt.MapFrom(x => x.Category.Name))
                // Premium placement: either the deterministic demo spread (Id % 5 == 0, no
                // migration needed) or an explicit admin promotion (Advert.Promoted).
                // Translates fine to SQL via ProjectTo.
                .ForMember(x => x.IsTop, opt => opt.MapFrom(x => x.Promoted || x.Id % 5 == 0))
                .ForMember(x => x.FavoritesCount, opt => opt.MapFrom(x => x.FavoritedByUsers.Count));
        }
    }
}
