namespace Olx.BLL.Models.User
{
    // POST /api/Admin/newsletter/send body — broadcast to every OlxUser with
    // NewsletterSubscribed == true (Profile Settings -> "Subscribe to Newsletter" toggle).
    public class NewsletterBroadcastModel
    {
        public string Subject { get; init; } = string.Empty;
        public string Body { get; init; } = string.Empty;
    }
}
