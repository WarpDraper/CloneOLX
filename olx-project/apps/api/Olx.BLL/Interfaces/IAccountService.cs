using Olx.BLL.DTOs.AdvertDtos;
using Olx.BLL.DTOs.OlxUserDtos;
using Olx.BLL.Models;
using Olx.BLL.Models.Authentication;
using Olx.BLL.Models.User;

namespace Olx.BLL.Interfaces
{
    public interface IAccountService
    {
        Task SendEmailConfirmationMessageAsync(string email);
        Task<AuthResponse> LoginAsync(AuthRequest model);
        Task<AuthResponse> GoogleLoginAsync(string googleAccessToken);
        Task LogoutAsync(string token);
        Task<AuthResponse> RefreshTokensAsync(string refreshToken);
        Task EmailConfirmAsync(EmailConfirmationModel confirmationModel);
        Task FogotPasswordAsync(string email);
        Task ResetPasswordAsync(ResetPasswordModel resetPasswordModel);
        Task SendEmailVerificationCodeAsync();
        Task VerifyEmailCodeAsync(string code);
        Task BlockUserAsync(UserBlockModel userBlockModel);
        // Returns the new account's AuthResponse (access + refresh token) for self-registration
        // (isAdmin = false), so the caller can log the user in immediately. Returns null for
        // admin-created accounts (isAdmin = true) — that call is made by an already-authenticated
        // admin creating someone else's account, so issuing tokens there would incorrectly log
        // the calling admin into the new account.
        Task<AuthResponse?> AddUserAsync(UserCreationModel userModel,bool isAdmin = false);
        Task RemoveAccountAsync(int id);
        Task<string> EditUserAsync(UserEditModel userEditModel,bool isAdmin = false);
        Task AddToFavoritesAsync(int advertId);
        Task AddToFavoritesRangeAsync(IEnumerable<int> advertIds);
        Task RemoveFromFavoritesAsync(int advertId);
        Task<IEnumerable<AdvertDto>> GetFavoritesAsync();
        Task CheckPasswordAsync(string password);
        Task<bool> SetNewsletterSubscriptionAsync(bool subscribed);

        // Own-profile lookup for the CURRENTLY AUTHENTICATED user only — id comes from the JWT,
        // never a route/query param, so this can never be used to read someone else's Balance/
        // NewsletterSubscribed/etc. (unlike GET /api/User/get/{id}, which is [AllowAnonymous] and
        // must never expose those fields).
        Task<MyProfileDto> GetMyProfileAsync();

        // Adds `amount` to the current user's wallet Balance and returns the new total. Mock
        // payment flow only (see WalletTopUpModal on the frontend) — no real payment gateway is
        // called here, this just persists the resulting balance server-side.
        Task<decimal> TopUpBalanceAsync(decimal amount);

        // Admin override: force-confirms a user's email without a confirmation token
        // (Admin > Users > "Confirm email" action).
        Task ForceConfirmEmailAsync(int userId);

        // Validates the Telegram Login Widget payload (HMAC-SHA256 over the bot token) and
        // either logs in the matching account (by TelegramId) or auto-registers a new one.
        Task<AuthResponse> TelegramLoginAsync(TelegramAuthModel model);

        // Admin > Marketing "newsletter" broadcast — emails every user with
        // NewsletterSubscribed == true. Returns the number of recipients the send was attempted
        // for (a single bad address never aborts the rest of the batch).
        Task<int> SendNewsletterAsync(NewsletterBroadcastModel model);
    }
}
