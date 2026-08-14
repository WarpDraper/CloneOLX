using AutoMapper;
using Microsoft.AspNetCore.Http;
using Olx.BLL.Entities;


namespace Olx.BLL.Models.User
{
    [AutoMap(typeof(OlxUser))]
    public class UserEditModel 
    {
        public int Id { get; init; }
        public string? OldPassword { get; init; }
        public string? Password { get; init; } = string.Empty;
        public string? PasswordConfirmation { get; init; } = string.Empty;
        public string? FirstName { get; init; }
        public string? LastName { get; init; }
        public IFormFile? ImageFile { get; init; }
        public string? WebSite { get; init; }
        public string? SettlementRef { get; init; }
        public string? About { get; init; }
        public string? PhoneNumber { get; init; }
<<<<<<< HEAD
        // "Individual" or "Business" — see OlxUser.AccountType. Like About/WebSite/SettlementRef,
        // AutoMapper's plain `mapper.Map(userEditModel, user)` overwrites the destination even
        // with a null source, so every edit/user submission must resend the current value or it
        // gets wiped — callers must not omit this field (see SettingsPage.tsx / UserProfilePage.tsx).
        public string? AccountType { get; init; }
=======
>>>>>>> origin/tobi-nazar
    }
}
