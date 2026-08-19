namespace Olx.BLL.Models.Ai
{
    // POST /api/AI/generate-advert request body — a short, free-text advert title
    // (e.g. "iPhone 13 128gb") the user has already typed into the Create Advert form.
    public class GenerateAdvertRequest
    {
        public string Title { get; set; } = string.Empty;
    }
}
