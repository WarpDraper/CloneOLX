using Microsoft.AspNetCore.Http;

namespace Olx.BLL.Models.User
{
    public class UserCreationModel
    {
        public string Email { get; init; } = string.Empty;
        public string Password { get; init; } = string.Empty;
        public string PasswordConfirmation { get; init; } = string.Empty;
        public string? FirstName { get; init; }
        public string? LastName { get; init; }
        public IFormFile? ImageFile { get; init; }
        public string? WebSite { get; init; }
        public string? About { get; init; }
        public string? PhoneNumber { get; init; }
        public string? SettlementRef { get; init; }
        public string RecapthcaToken { get; init; } = string.Empty;
        public string Action { get; init; } = string.Empty;
        // Registration form's mandatory "I agree to the Terms of Service and Privacy Policy"
        // checkbox — validated server-side too (UserCreationModelValidator) so the rule can't be
        // bypassed by calling the API directly.
        public bool TermsAccepted { get; init; }
    }
}
