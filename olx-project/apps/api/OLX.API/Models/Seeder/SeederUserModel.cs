namespace OLX.API.Models.Seeder
{
    public class SeederUserModel
    {
        public string Email { get; init; } = string.Empty;
        public string Password { get; init; } = string.Empty;
        public string? FirstName { get; init; }
        public string? LastName { get; init; }
        public string Role { get; init; } = string.Empty;
        public string? PhoneNumber { get; init; }
        public string? PhotoBase64 { get; init; }
        public string? PhotoUrl { get; init; }
        public string? WebSite { get; init; }
        public string? About { get; init; }
        // Real DB-assigned Settlement.Ref (same GUID space used by SeederAdvertModel.SettlementRef)
        // — optional, since not every fixture user needs a declared location.
        public string? SettlementRef { get; init; }
        // Optional — falls back to the OlxUser entity defaults (Rating = 5.0, ReviewsCount = 0)
        // in DBSeeder when omitted, so every seeded user no longer renders the same uniform
        // default on seller cards.
        public double? Rating { get; init; }
        public int? ReviewsCount { get; init; }
    }
}
