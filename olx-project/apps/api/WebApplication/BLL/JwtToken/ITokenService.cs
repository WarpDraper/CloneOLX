using Domain;
using System.Security.Claims;

namespace BLL.JwtToken
{
    public interface ITokenService
    {
        Task<string> CreateTokenAsync(AppUser user);
        string CreateRefreshToken();
        ClaimsPrincipal GetPrincipalFromExpiredToken(string token);
    }
}
