namespace Olx.BLL.Models.Category
{
    // Structured result of IAiService.GenerateCategoryTranslationAsync — mirrors the JSON
    // response schema sent to Gemini in GeminiAiService.BuildCategoryTranslationPrompt.
    public class CategoryTranslationResult
    {
        public string NameUk { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
    }
}
