namespace Olx.BLL.Models.Authentication
{
    // Payload posted by the Telegram Login Widget (https://core.telegram.org/widgets/login) —
    // field names match Telegram's callback data exactly (snake_case) so the frontend can pass
    // the widget's `onauth` object straight through as JSON.
    public class TelegramAuthModel
    {
        public long Id { get; init; }
        public string? First_Name { get; init; }
        public string? Last_Name { get; init; }
        public string? Username { get; init; }
        public string? Photo_Url { get; init; }
        public long Auth_Date { get; init; }
        public string Hash { get; init; } = string.Empty;
    }
}
