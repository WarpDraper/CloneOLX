using Domain;
using AutoMapper;
using BLL.DTO.Authorize;
using BLL.JwtToken;
using Microsoft.AspNetCore.Identity;

namespace WebApplication25.Configuration.Mapping
{
    public class MappingProfile : Profile
    {
      //  private readonly TokenService _tokenService;

        public MappingProfile() {
           var _tokenService = ServiceLocator.ServiceProviderPublic.GetService<TokenService>();

            CreateMap<RegisterDto, AppUser>()
                .ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.Email));
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
