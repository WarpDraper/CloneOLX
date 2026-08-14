using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Olx.BLL.Entities;
<<<<<<< HEAD
using Olx.BLL.Entities.NewPost;
=======
>>>>>>> origin/tobi-nazar
using Olx.BLL.Exceptions;
using Olx.BLL.Helpers.Options;
using Olx.BLL.Interfaces;
using Olx.BLL.Resources;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Olx.BLL.Services
{
<<<<<<< HEAD
    public class JwtService(IConfiguration configuration, UserManager<OlxUser> userManager, IRepository<Settlement> settlementRepository) : IJwtService
=======
    public class JwtService(IConfiguration configuration, UserManager<OlxUser> userManager) : IJwtService
>>>>>>> origin/tobi-nazar
    {
        private JwtOptions _jwtOpts = configuration.GetSection(nameof(JwtOptions)).Get<JwtOptions>()
                ?? throw new HttpException(Errors.JwtSettingsReadError, HttpStatusCode.InternalServerError);

        public string GetRefreshToken()
        {
            var randomNumber = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomNumber);
            return Convert.ToBase64String(randomNumber);
        }

        public string CreateToken(IEnumerable<Claim> claims)
        {
            var time = DateTime.UtcNow.AddMinutes(_jwtOpts.AccessTokenLifetimeInMinutes);
            var credentials = getCredentials(_jwtOpts);
            var token = new JwtSecurityToken(
                issuer: _jwtOpts.Issuer,
                claims: claims,
                expires: time,
                signingCredentials: credentials);
            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public async Task<IEnumerable<Claim>> GetClaimsAsync(OlxUser user)
        {
<<<<<<< HEAD
            // "city" must be a human-readable settlement name for the frontend (UserProfilePage/
            // SettingsPage render it directly) — resolve the raw SettlementRef GUID against
            // tbl_Settlements instead of putting the GUID itself in the claim.
            var settlementDescription = string.IsNullOrEmpty(user.SettlementRef)
                ? string.Empty
                : (await settlementRepository.GetByIDAsync(user.SettlementRef))?.Description ?? string.Empty;

=======
>>>>>>> origin/tobi-nazar
            var claims = new List<Claim>
            {
                // 1. ID користувача (тут усе добре)
                new (ClaimTypes.NameIdentifier, user.Id.ToString()),
        
                // 2. Використовуємо стандартний ClaimTypes.Email (фронтенд його розпізнає краще)
                new (ClaimTypes.Email, user.Email!),
        
                // 3. Склеюємо ім'я та прізвище у стандартний ClaimTypes.Name
                new (ClaimTypes.Name, $"{user.FirstName} {user.LastName}".Trim()),
        
                // Залишаємо ці поля про всяк випадок, якщо вони потрібні в інших місцях
                new ("firstName", user.FirstName ?? string.Empty),
                new ("lastName", user.LastName ?? string.Empty),
                new ("phoneNumber", user.PhoneNumber ?? string.Empty),
        
                // 4. Перейменовуємо "photo" на "avatarUrl", як хоче фронтенд
                new ("avatarUrl", user.Photo ?? string.Empty),
        
<<<<<<< HEAD
                // 5. Перейменовуємо "settlement" на "city" для відображення локації —
                // людиночитна назва (напр. "м. Київ"), а не сирий SettlementRef GUID.
                new ("city", settlementDescription),
                new ("website", user.WebSite ?? string.Empty),
                new ("accountType", user.AccountType),
            };
            // Must be ClaimTypes.Role (not a custom "roles" claim) — [Authorize(Roles = ...)]
            // on AccountController/AdvertController/ChatController/UserController checks claims
            // of type ClaimTypes.Role by default (RoleClaimType isn't overridden in
            // OlxApiServiceExtensions' TokenValidationParameters). A custom claim type here
            // authenticates fine but fails every role check with 403 Forbidden even for a valid
            // token — and the frontend's authSlice.ts decodes the same ClaimTypes.Role URI for
            // user.role, so this also silently hid the Header "Admin" button for actual admins.
            var roles = await userManager.GetRolesAsync(user);
            claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));
=======
                // 5. Перейменовуємо "settlement" на "city" для відображення локації
                new ("city", user.SettlementRef ?? string.Empty),
                new ("website", user.WebSite ?? string.Empty),
            };
            var roles = await userManager.GetRolesAsync(user);
            claims.AddRange(roles.Select(role => new Claim("roles", role)));
>>>>>>> origin/tobi-nazar
            return claims;
        }

        public int GetRefreshTokenLiveTime() => _jwtOpts.RefreshTokenLifetimeInDays;

        private SigningCredentials getCredentials(JwtOptions options)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.Key));
            return new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);
        }
    }
}
