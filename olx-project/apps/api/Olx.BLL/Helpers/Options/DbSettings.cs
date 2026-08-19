namespace Olx.BLL.Helpers.Options
{
    // Bound from the "DbSettings" configuration section (appsettings*.json /
    // DbSettings__* env vars). Property names intentionally mirror the JSON keys
    // exactly (Server/Port/Database/UserId/Password) so configuration binding via
    // GetSection(nameof(DbSettings)).Get<DbSettings>() works without any [JsonPropertyName]
    // aliasing — keep both in sync if either side ever changes.
    public class DbSettings
    {
        public string Server { get; set; } = string.Empty;
        public string Port { get; set; } = string.Empty;
        public string Database { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
