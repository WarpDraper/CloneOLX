using AutoMapper;
using BLL.DTO.Authorize;
using BLL.DTO.Report;
using BLL.DTO.User;
using BLL.JwtToken;
using Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using OLXCLONE.DTO.User;

namespace WebApplication25.Configuration.Mapping
{
    public class MappingProfile : Profile
    {
      //  private readonly TokenService _tokenService;

        public MappingProfile() {
           var _tokenService = ServiceLocator.ServiceProviderPublic.GetService<TokenService>();

            CreateMap<RegisterDto, AppUser>()
                .ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.Email));

            // Privacy Mappings
            CreateMap<AppUser, UserPublicProfileDto>();
            CreateMap<AppUser, UserDto>();
            CreateMap<PrivacySettingsDto, AppUser>()
                .ForMember(dest => dest.IsPhoneNumberPrivate, opt => opt.MapFrom(src => src.IsPhoneNumberPrivate))
                .ForMember(dest => dest.IsLocationPrivate, opt => opt.MapFrom(src => src.IsLocationPrivate));

            // Report Mappings
            CreateMap<Report, ReportDto>()
                .ForMember(dest => dest.TargetUserName, opt => opt.MapFrom(src => src.TargetUser.UserName));
            CreateMap<CreateReportDto, Report>();
        }
    }

    public class TokenServiceProvider
    {
        private readonly IConfiguration _configuration;
        private readonly UserManager<AppUser> _userManager;
        public TokenServiceProvider(IConfiguration configuration, UserManager<AppUser> userManager)
        {
            _configuration = configuration;
            _userManager = userManager;
        }
        public TokenService GetTokenService()
        {
            return new TokenService(_configuration, _userManager);
        }
    }
}
