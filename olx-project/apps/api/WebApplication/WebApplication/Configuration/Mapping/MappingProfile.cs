using AuthDomain;
using AutoMapper;
using BLL.JwtToken;
using Microsoft.AspNetCore.Identity;
using OnlineLibrary_BookKey.DTO.Authorize;

namespace WebApplication25.Configuration.Mapping
{
    public class MappingProfile : Profile
    {
      //  private readonly TokenService _tokenService;

        public MappingProfile() {
           var _tokenService = ServiceLocator.ServiceProviderPublic.GetService<TokenService>();

            CreateMap<RegisterDto, ApplicationUser>()
                .ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.Email))
                  .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.UserName));


          /*  CreateMap<Book, BookDto>();


            CreateMap<CreateBookDto, Book>()
                .ForMember(dest => dest.Rating, opt => opt.Ignore());

            CreateMap<UpdateBookDto, Book>();

            CreateMap<Domain.BookUser, UserLibraryDto>()
            .ForMember(dest => dest.BookId, opt => opt.MapFrom(src => src.BookId))
            .ForMember(dest => dest.IsFinished, opt => opt.MapFrom(src => src.IsFinished))
            .ForMember(dest => dest.AddedDate, opt => opt.MapFrom(src => src.AddedDate))

            .ForMember(dest => dest.Title, opt => opt.MapFrom(src => src.Book.Title))
            .ForMember(dest => dest.Author, opt => opt.MapFrom(src => src.Book.Author))
            .ForMember(dest => dest.Image, opt => opt.MapFrom(src => src.Book.Image));*/
        }
    }

    public class TokenServiceProvider
    {
        private readonly IConfiguration _configuration;
        private readonly UserManager<ApplicationUser> _userManager;
        public TokenServiceProvider(IConfiguration configuration, UserManager<ApplicationUser> userManager)
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
