namespace Olx.BLL.Models.Ai
{
    // Structured JSON result of the Gemini generate-advert prompt. Property names match the
    // camelCase JSON schema sent to Gemini's generationConfig.responseSchema, so
    // System.Text.Json can deserialize the model's response directly onto this type.
    public class GenerateAdvertResponse
    {
        public int SuggestedCategoryId { get; set; }
        public string GeneratedDescription { get; set; } = string.Empty;
    }
}
