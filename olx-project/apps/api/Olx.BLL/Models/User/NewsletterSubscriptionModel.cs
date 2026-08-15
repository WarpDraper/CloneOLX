namespace Olx.BLL.Models.User
{
    // Body for POST /api/Account/subscribe — explicit desired state for the Profile Settings
    // "Subscribe to Newsletter / Updates" toggle.
    public class NewsletterSubscriptionModel
    {
        public bool Subscribed { get; init; }
    }
}
