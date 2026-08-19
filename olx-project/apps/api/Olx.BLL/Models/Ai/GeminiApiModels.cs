using System.Text.Json.Serialization;

namespace Olx.BLL.Models.Ai
{
    // Minimal shape of the Google Gemini `generateContent` REST response — only the fields
    // GeminiAiService actually reads out of the configured GeminiOptions endpoint
    // (https://generativelanguage.googleapis.com/v1beta/models/{Model}:generateContent, default
    // model "gemini-3.5-flash-lite").
    // Internal: callers only ever see the parsed GenerateAdvertResponse.
    internal sealed class GeminiGenerateContentResponse
    {
        [JsonPropertyName("candidates")]
        public List<GeminiCandidate>? Candidates { get; set; }

        [JsonPropertyName("promptFeedback")]
        public GeminiPromptFeedback? PromptFeedback { get; set; }
    }

    internal sealed class GeminiCandidate
    {
        [JsonPropertyName("content")]
        public GeminiContent? Content { get; set; }

        [JsonPropertyName("finishReason")]
        public string? FinishReason { get; set; }
    }

    internal sealed class GeminiContent
    {
        [JsonPropertyName("parts")]
        public List<GeminiPart>? Parts { get; set; }
    }

    internal sealed class GeminiPart
    {
        [JsonPropertyName("text")]
        public string? Text { get; set; }
    }

    // Present when Gemini blocked the prompt/response outright (safety filters etc.) instead of
    // returning any candidates — surfaced in the error message so it isn't just a generic 502.
    internal sealed class GeminiPromptFeedback
    {
        [JsonPropertyName("blockReason")]
        public string? BlockReason { get; set; }
    }
}
