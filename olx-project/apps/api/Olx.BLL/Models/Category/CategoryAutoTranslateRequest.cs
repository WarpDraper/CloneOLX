namespace Olx.BLL.Models.Category
{
    // POST /api/admin/categories/auto-translate — a short free-text prompt (e.g. a draft
    // category name in any language) that Gemini turns into UK/EN category titles + a slug.
    public class CategoryAutoTranslateRequest
    {
        public string Prompt { get; init; } = string.Empty;
    }
}
