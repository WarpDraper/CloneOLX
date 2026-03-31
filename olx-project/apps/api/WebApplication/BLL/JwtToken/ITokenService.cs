using AuthDomain;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text;

namespace BLL.JwtToken
{
    public interface ITokenService
    {
        Task<string> CreateTokenAsync(ApplicationUser user);
        string CreateRefreshToken();
        ClaimsPrincipal GetPrincopalFromExpiredToken(string token);
    }
}
