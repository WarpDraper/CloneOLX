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
                .ForMember(x => x.SettlementName, opt => opt.MapFrom(x => x.Settlement.Description))
                .ForMember(x => x.SettlementRef, opt => opt.MapFrom(x => x.Settlement.Ref))
                .ForMember(x => x.RegionRef, opt => opt.MapFrom(x => x.Settlement.Region))
                .ForMember(x => x.AreaRef, opt => opt.MapFrom(x => x.Settlement.SettlementRegion != null ? x.Settlement.SettlementRegion.AreaRef : string.Empty))
                .ForMember(x => x.CategoryName, opt => opt.MapFrom(x => x.Category.Name))
                // Deterministic premium placement — no persisted column/migration needed (see
                // AdvertDto.IsTop). Translates to `Id % 5 == 0` in SQL fine via ProjectTo.
                .ForMember(x => x.IsTop, opt => opt.MapFrom(x => x.Id % 5 == 0))
                .ForMember(x => x.FavoritesCount, opt => opt.MapFrom(x => x.FavoritedByUsers.Count));
        }
    }
}
