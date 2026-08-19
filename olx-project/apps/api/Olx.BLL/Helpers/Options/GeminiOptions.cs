namespace Olx.BLL.Helpers.Options
{
    // Strongly-typed config for the Google Gemini `generateContent` REST integration (see
    // GeminiAiService). Bound from the "Gemini" configuration section by
    // OlxBLLServiceExtensions.AddOlxBLLServices — which also falls back to the legacy flat
    // "GeminiApiKey" key so existing user-secrets/env-var setups (see SECRETS.md) keep working
    // without re-configuring anything.
    public class GeminiOptions
    {
        public const string SectionName = "Gemini";

        public const string DefaultModel = "gemini-3.5-flash-lite";
        public const string DefaultApiUrl = "https://generativelanguage.googleapis.com/v1beta";

        public string ApiKey { get; set; } = string.Empty;
        public string Model { get; set; } = DefaultModel;
        public string ApiUrl { get; set; } = DefaultApiUrl;

        // Full `generateContent` endpoint for the configured model, e.g.
        // "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent".
        // Header-based auth (x-goog-api-key, set by GeminiAiService.CallGeminiAsync) means the
        // key is never appended here as a "?key=" query parameter.
        public string GenerateContentUrl => $"{ApiUrl.TrimEnd('/')}/models/{Model}:generateContent";
    }
}
