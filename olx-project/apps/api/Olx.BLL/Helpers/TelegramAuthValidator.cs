using Olx.BLL.Models.Authentication;
using System.Security.Cryptography;
using System.Text;

namespace Olx.BLL.Helpers
{
    /// <summary>
    /// Verifies the Telegram Login Widget payload per
    /// https://core.telegram.org/widgets/login#checking-authorization: every field except
    /// `hash` is sorted alphabetically into "key=value" lines, joined with "\n", HMAC-SHA256'd
    /// with SHA256(bot_token) as the key, and compared (hex, constant-time) against the
    /// `hash` field Telegram sent.
    /// </summary>
    public static class TelegramAuthValidator
    {
        // Telegram recommends rejecting stale auth payloads (replay protection) — a widget
        // callback should be consumed within a minute or two of being issued.
        private static readonly TimeSpan MaxAuthAge = TimeSpan.FromMinutes(5);

        public static bool IsValid(TelegramAuthModel model, string botToken)
        {
            if (string.IsNullOrWhiteSpace(botToken) || string.IsNullOrWhiteSpace(model.Hash))
            {
                return false;
            }

            var authDate = DateTimeOffset.FromUnixTimeSeconds(model.Auth_Date);
            if (DateTimeOffset.UtcNow - authDate > MaxAuthAge)
            {
                return false;
            }

            var fields = new SortedDictionary<string, string>(StringComparer.Ordinal);
            void AddIfPresent(string key, string? value)
            {
                if (!string.IsNullOrEmpty(value)) fields[key] = value;
            }

            fields["id"] = model.Id.ToString();
            AddIfPresent("first_name", model.First_Name);
            AddIfPresent("last_name", model.Last_Name);
            AddIfPresent("username", model.Username);
            AddIfPresent("photo_url", model.Photo_Url);
            fields["auth_date"] = model.Auth_Date.ToString();

            var dataCheckString = string.Join('\n', fields.Select(kv => $"{kv.Key}={kv.Value}"));

            var secretKey = SHA256.HashData(Encoding.UTF8.GetBytes(botToken));
            var computedHash = HMACSHA256.HashData(secretKey, Encoding.UTF8.GetBytes(dataCheckString));
            // Convert.ToHexStringLower is .NET 9+; this project targets net8.0.
            var computedHex = Convert.ToHexString(computedHash).ToLowerInvariant();

            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(computedHex),
                Encoding.UTF8.GetBytes(model.Hash.ToLowerInvariant()));
        }
    }
}
