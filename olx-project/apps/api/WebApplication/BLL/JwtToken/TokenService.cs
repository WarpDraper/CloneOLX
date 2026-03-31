using AuthDomain;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

using System.Threading.Tasks;

namespace BLL.JwtToken
{
    public class TokenService : ITokenService
    {
        private readonly IConfiguration _configuration;
        private readonly UserManager<ApplicationUser> _userManager;
        public TokenService(IConfiguration configuration, UserManager<ApplicationUser> userManager)
        {
            _configuration = configuration;
            _userManager = userManager;
        }
        public async Task<string> CreateTokenAsync(ApplicationUser user)
        {
            var claims = new List<Claim>()
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Name, user.UserName),
                new Claim(JwtRegisteredClaimNames.Email, user.Email)

            };

            var roles = await _userManager.GetRolesAsync(user);

            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JWTSettings:key"]));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _configuration["JWTSettings:Issuer"],
                audience: _configuration["JWTSettings:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(15),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public string CreateRefreshToken()
        {
            var randomNumber = new byte[32];
            using (var num = RandomNumberGenerator.Create())//случайний набір чисел 
            {
                num.GetBytes(randomNumber);
            }
           return Convert.ToBase64String(randomNumber);
        }

        public ClaimsPrincipal GetPrincopalFromExpiredToken(string token)//старий токен
        {//застарілий токен сюди приходить, розшифровує, і записує у новий створений ті дані зі старого
            var tokenHandler = new JwtSecurityTokenHandler();//авто. перевірка на теперешнього токена
            var valid = new TokenValidationParameters//тут новий токен ( шаблон ) - він зчитується з JWTSettings (в appsettings.json) 
            {//старий токен має бути розшифрованим 
                ValidateIssuer = true,//перевірка видавця
                ValidateAudience = true,//перевірка на хто може читати
                ValidateLifetime = false,//перевірка життя не тре
                ValidateIssuerSigningKey = true,
                ValidIssuer = _configuration["JWTSettings:Issuer"],
                ValidAudience = _configuration["JWTSettings:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JWTSettings:key"]))
            };
            return tokenHandler.ValidateToken(token, valid, out _);
            //старий токен і шаблон на який можна перевірити
            //якщо буде співпадати то буде створювати новий токен
        }

    }
}
