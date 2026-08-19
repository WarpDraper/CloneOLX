using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Olx.BLL.Entities;
using Olx.BLL.Entities.NewPost;
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
    public class JwtService(IConfiguration configuration, UserManager<OlxUser> userManager, IRepository<Settlement> settlementRepository) : IJwtService
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
            // "city" must be a human-readable settlement name for the frontend (UserProfilePage/
            // SettingsPage render it directly) — resolve the raw SettlementRef GUID against
            // tbl_Settlements instead of putting the GUID itself in the claim.
            var settlementDescription = string.IsNullOrEmpty(user.SettlementRef)
                ? string.Empty
                : (await settlementRepository.GetByIDAsync(user.SettlementRef))?.Description ?? string.Empty;

            var claims = new List<Claim>
            {
                // 1. ID користувача (тут усе добре)
                new (ClaimTypes.NameIdentifier, user.Id.ToString()),

                // Short, non-schema aliases for the same id — jwt-decode on the frontend returns
                // the raw JWT payload object keyed by whatever the claim "type" string literally
                // is. ClaimTypes.NameIdentifier serializes as the long
                // "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier" URI,
                // which is easy to typo/miss client-side — "id"/"nameid" give the frontend a
                // short key to read first without needing the schema URI at all.
                new ("id", user.Id.ToString()),
                new ("nameid", user.Id.ToString()),

                // 2. Використовуємо стандартний ClaimTypes.Email (фронтенд його розпізнає краще)
                new (ClaimTypes.Email, user.Email!),

                // Short alias, same reasoning as "id"/"nameid" above.
                new ("email", user.Email ?? string.Empty),

                // 3. Склеюємо ім'я та прізвище у стандартний ClaimTypes.Name
                new (ClaimTypes.Name, $"{user.FirstName} {user.LastName}".Trim()),
        
                // Залишаємо ці поля про всяк випадок, якщо вони потрібні в інших місцях
                new ("firstName", user.FirstName ?? string.Empty),
                new ("lastName", user.LastName ?? string.Empty),
                new ("phoneNumber", user.PhoneNumber ?? string.Empty),
        
                // 4. Перейменовуємо "photo" на "avatarUrl", як хоче фронтенд
                new ("avatarUrl", user.Photo ?? string.Empty),

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
            // GetRolesAsync always returns a (possibly empty) list, never null — the ?? [] here
            // is defense-in-depth against a custom IUserManager/IRoleStore implementation ever
            // violating that contract, so a user with zero roles still logs in cleanly instead
            // of a NullReferenceException on .Select() below.
            var roles = await userManager.GetRolesAsync(user) ?? [];
            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
                // Short alias — same "id"/"email" rationale above, so a frontend decoder never
                // has to know the long
                // "http://schemas.microsoft.com/ws/2008/06/identity/claims/role" URI to find it.
                claims.Add(new Claim("role", role));
            }
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
