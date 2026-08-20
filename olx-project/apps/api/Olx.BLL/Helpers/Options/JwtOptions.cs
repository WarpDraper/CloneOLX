
namespace Olx.BLL.Helpers.Options
{
    public class JwtOptions
    {
        /// <summary>
        /// Used whenever "JwtOptions:Issuer" isn't configured (missing key in
        /// appsettings/user-secrets), so token generation (JwtService) and token validation
        /// (OlxApiServiceExtensions) can never disagree and end up minting/requiring an empty
        /// "iss" claim — that combination fails with "The issuer '' is invalid" even though the
        /// generated and required issuer are technically equal.
        /// </summary>
        public const string DefaultIssuer = "OlxCloneAPI";

        /// <summary>
        /// Neither appsettings.Development.json nor appsettings.Production.json actually sets
        /// "JwtOptions:AccessTokenLifetimeInMinutes"/"RefreshTokenLifetimeInDays" (only
        /// user-secrets' JwtOptions:Key is documented in SECRETS.md) — so both int properties
        /// below silently bound to 0. That made CreateToken mint access tokens that expired the
        /// instant they were issued (DateTime.UtcNow.AddMinutes(0)), and CreateRefreshToken write
        /// refresh-token DB rows with ExpirationDate = DateTime.UtcNow.AddDays(0) — already
        /// expired before the client's first refresh attempt. Together that's exactly "logged
        /// out a few minutes after login with no working silent refresh". These fallbacks (used
        /// via EffectiveAccessTokenLifetimeInMinutes/EffectiveRefreshTokenLifetimeInDays below)
        /// keep auth usable even if a config key is ever missing again.
        /// </summary>
        public const int DefaultAccessTokenLifetimeInMinutes = 60;
        public const int DefaultRefreshTokenLifetimeInDays = 30;

        public string Issuer { get; set; } = string.Empty;
        public string Key { get; set; } = string.Empty;
        public int AccessTokenLifetimeInMinutes { get; set; }
        public int RefreshTokenLifetimeInDays { get; set; }

        /// <summary>
        /// The issuer value that should actually be used for signing and validation. Falls back
        /// to <see cref="DefaultIssuer"/> when <see cref="Issuer"/> is null/empty/whitespace.
        /// </summary>
        public string EffectiveIssuer => string.IsNullOrWhiteSpace(Issuer) ? DefaultIssuer : Issuer;

        /// <summary>
        /// The access-token lifetime that should actually be used. Falls back to
        /// <see cref="DefaultAccessTokenLifetimeInMinutes"/> when unconfigured (&lt;= 0).
        /// </summary>
        public int EffectiveAccessTokenLifetimeInMinutes =>
            AccessTokenLifetimeInMinutes > 0 ? AccessTokenLifetimeInMinutes : DefaultAccessTokenLifetimeInMinutes;

        /// <summary>
        /// The refresh-token lifetime that should actually be used — shared by JwtService
        /// (RefreshToken DB row's ExpirationDate) and AccountController (the HttpOnly cookie's
        /// Expires) so the two can never drift apart. Falls back to
        /// <see cref="DefaultRefreshTokenLifetimeInDays"/> when unconfigured (&lt;= 0).
        /// </summary>
        public int EffectiveRefreshTokenLifetimeInDays =>
            RefreshTokenLifetimeInDays > 0 ? RefreshTokenLifetimeInDays : DefaultRefreshTokenLifetimeInDays;
    }
}
