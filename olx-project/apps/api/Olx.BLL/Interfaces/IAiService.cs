using Olx.BLL.Models.Ai;
using Olx.BLL.Models.Category;

namespace Olx.BLL.Interfaces
{
    public interface IAiService
    {
        // Prompts Google Gemini with just the advert title and the current category tree, and
        // asks it to suggest a category and write a structured description. Throws
        // HttpException on a missing API key or an upstream Gemini failure.
        Task<GenerateAdvertResponse> GenerateAdvertContentAsync(string title, CancellationToken cancellationToken = default);

        // POST /api/admin/categories/auto-translate — turns a free-text category name/prompt
        // into UK/EN titles + a URL slug via the same Gemini endpoint. Throws HttpException on
        // a missing API key or an upstream Gemini failure.
        Task<CategoryTranslationResult> GenerateCategoryTranslationAsync(string prompt, CancellationToken cancellationToken = default);
    }
}
