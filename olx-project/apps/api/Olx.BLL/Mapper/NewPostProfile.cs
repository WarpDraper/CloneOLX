
using AutoMapper;
using Olx.BLL.DTOs.NewPost;
using Olx.BLL.Entities.NewPost;

namespace Olx.BLL.Mapper
{
    public class NewPostProfile : Profile
    {
        public NewPostProfile()
        {
            // --- Self-maps for NewPostService.UpdateNewPostData's upsert loop ------------------
            // mapper.Map(apiEntity, trackedEntity) updates an already-tracked Area/Region/
            // Settlement row in place with fresh data from the Nova Poshta API. AutoMapper
            // auto-generates a same-type map when none is registered, which by convention also
            // copies EF navigation/collection properties byte-for-byte — and the Nova Poshta API
            // payload never populates those (Area.Regions, Region.Area, Settlement.Users/
            // Adverts/SettlementRegion all come back default/empty on the freshly-deserialized
            // apiEntity). Applied to a *tracked* entity, that overwrite clears the real,
            // previously-loaded collection navigation (e.g. Area.Regions), EF treats the removed
            // children as orphaned, and — because AreaRef/Region are required (non-nullable) FKs
            // — orphaning triggers a cascade DELETE instead of a null-out. That delete cascades
            // through tbl_Regions into tbl_Settlements, which Postgres then rejects with 23503
            // because AspNetUsers/Adverts still reference those settlement rows.
            // ForMember(...).Ignore() on every navigation/collection property (and on Ref, the
            // primary key / FK target) makes the self-map touch only the plain scalar columns
            // Nova Poshta actually sends, so an update can never orphan or repoint a referenced
            // row.
            CreateMap<Area, Area>()
                .ForMember(x => x.Ref, opt => opt.Ignore())
                .ForMember(x => x.Regions, opt => opt.Ignore());
            CreateMap<Region, Region>()
                .ForMember(x => x.Ref, opt => opt.Ignore())
                .ForMember(x => x.Area, opt => opt.Ignore());
            CreateMap<Settlement, Settlement>()
                .ForMember(x => x.Ref, opt => opt.Ignore())
                .ForMember(x => x.Users, opt => opt.Ignore())
                .ForMember(x => x.Adverts, opt => opt.Ignore())
                .ForMember(x => x.SettlementRegion, opt => opt.Ignore());
            CreateMap<Area, AreaDto>()
                .ForMember(x => x.Regions, opt => opt.MapFrom(z => z.Regions.Select(y => y.Ref)));
            CreateMap<Settlement, SettlementDto>()
                .ForMember(x => x.Area, opt => opt.MapFrom(x => x.SettlementRegion != null ? x.SettlementRegion.AreaRef : null));
            CreateMap<Region, RegionDto>();
        }
    }
}
