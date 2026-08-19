using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Olx.BLL.Exceptions;
using Olx.BLL.Helpers;
using Olx.BLL.Interfaces;
using Olx.BLL.Models;
using Olx.BLL.Models.Authentication;
using Olx.BLL.Models.User;
using System.Security.Claims;


namespace OLX.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // Контролер облікових операцій: надає API для входу, реєстрації, профілю та управління улюбленими оголошеннями.
    public class AccountController(IAccountService accountService, IConfiguration configuration, ILogger<AccountController> logger) : ControllerBase
    {
        // Scoped to this controller's routes so the refresh token cookie is only ever sent
        // to the auth endpoints that need it (login/refresh/logout), never to unrelated APIs.
        private const string RefreshTokenCookiePath = "/api/Account";
        private readonly string _refreshTokenCookiesName = configuration["RefreshTokenCookiesName"]!;

        // Профіль поточного авторизованого користувача (включно з Balance) — id береться з JWT,
        // а не з параметра запиту, тож ніколи не може повернути чийсь чужий баланс. Використовує
        // GET /api/User/get/{id} для перегляду ЧУЖОГО (публічного) профілю продавця — там Balance
        // навмисно відсутній у DTO.
        [Authorize]
        [HttpGet("profile")]
        public async Task<IActionResult> GetMyProfile() => Ok(await accountService.GetMyProfileAsync());

        // Поповнює гаманець поточного користувача. Мок-оплата (WalletTopUpModal на фронтенді) —
        // реального платіжного шлюзу тут немає, тільки персистентний запис результату в БД.
        [Authorize]
        [HttpPost("wallet/topup")]
        public async Task<IActionResult> TopUpWallet([FromBody] WalletTopUpModel model)
        {
            var newBalance = await accountService.TopUpBalanceAsync(model.Amount);
            return Ok(new { balance = newBalance });
        }

        // Повертає список улюблених оголошень поточного користувача.
        // [Authorize] (not Roles = Roles.User): any authenticated account can have favorites,
        // including Admin accounts — DbSeeder/AccountService.AddUserAsync only ever grants an
        // account ONE role (Admin xor User, never both), so an admin never carries the "User"
        // role claim and would get 403 Forbidden here under a Roles.User-gated [Authorize].
        [Authorize]
        [HttpGet("favorites")]
        public async Task<IActionResult> GetFavorites()
        {
            var favorites = await accountService.GetFavoritesAsync();
            return Ok(favorites);
        }

        // Аутентифікує користувача за email/паролем і повертає токени доступу.
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] AuthRequest model)
        {
            try
            {
                var authResponse = await accountService.LoginAsync(model);
                SetRefreshTokenCookie(authResponse.RefreshToken);
                return Ok(new AccessTokenResponse { AccessToken = authResponse.AccessToken });
            }
            catch (HttpException)
            {
                // Expected business-rule failures (bad credentials, locked account, unconfirmed
                // email, ...) — already logged/shaped correctly by GlobalExceptionHandlerMiddleware.
                throw;
            }
            catch (Exception ex)
            {
                // Anything else here is unexpected — e.g. the Npgsql "column ... does not exist"
                // error a schema/entity mismatch (missing migration) produces, or a JWT signing
                // failure. Logged here with the request's email for context; the actual 500
                // response is still shaped by GlobalExceptionHandlerMiddleware's catch-all so the
                // client always gets a consistent { message } JSON body instead of an empty
                // connection reset.
                logger.LogError(ex, "Login failed unexpectedly for {Email}.", model.Email);
                throw;
            }
        }

        // Аутентифікує користувача через Google access token.
        [HttpPost("login/google")]
        public async Task<IActionResult> GoogleLogin([FromQuery] string googleAccessToken)
        {
            var authResponse = await accountService.GoogleLoginAsync(googleAccessToken);
            SetRefreshTokenCookie(authResponse.RefreshToken);
            return Ok(new AccessTokenResponse { AccessToken = authResponse.AccessToken });
        }

        // Аутентифікує/реєструє користувача через Telegram Login Widget (HMAC-SHA256 перевірка
        // з токеном бота відбувається в AccountService.TelegramLoginAsync).
        [HttpPost("telegram-login")]
        public async Task<IActionResult> TelegramLogin([FromBody] TelegramAuthModel model)
        {
            var authResponse = await accountService.TelegramLoginAsync(model);
            SetRefreshTokenCookie(authResponse.RefreshToken);
            return Ok(new AccessTokenResponse { AccessToken = authResponse.AccessToken });
        }

        // Виходить із системи й анулює refresh token, якщо він надійшов.
        [HttpPost("user/logout")]
        public async Task<IActionResult> LogOut([FromBody] LogoutModel? logoutModel)
        {
            if (Request.Cookies.TryGetValue(_refreshTokenCookiesName, out var cookieToken))
            {
                DeleteRefreshTokenCookie();
                await accountService.LogoutAsync(cookieToken);
            }
            else if (logoutModel is not null && logoutModel.RefreshToken is not null)
            {
                await accountService.LogoutAsync(logoutModel.RefreshToken);
            }
            return Ok();
        }

        // Оновлює токени доступу за допомогою refresh token.
        [HttpPost("user/refresh")]
        public async Task<IActionResult> RefreshTokens([FromBody] RefreshRequest? refreshRequest)
        {
            string token;
            if (Request.Cookies.TryGetValue(_refreshTokenCookiesName, out var httpToken))
            {
                token = httpToken;
            }
            else if (refreshRequest is not null && refreshRequest.RefreshToken is not null)
            {
                token = refreshRequest.RefreshToken;
            }
            else return Unauthorized();
            var authResponse = await accountService.RefreshTokensAsync(token);
            SetRefreshTokenCookie(authResponse.RefreshToken);
            return Ok(new AccessTokenResponse { AccessToken = authResponse.AccessToken });
        }

        // Підтверджує email користувача за допомогою коду/моделі підтвердження.
        [HttpPost("email/confirm")]
        public async Task<IActionResult> ConfirmEmail([FromBody] EmailConfirmationModel confirmationModel)
        {
            await accountService.EmailConfirmAsync(confirmationModel);
            return Ok();
        }

        // Надсилає лист з підтвердженням email на вказану адресу.
        [HttpPost("email/sendconfirm")]
        public async Task<IActionResult> SendConfirmEmail([FromQuery] string email)
        {
            await accountService.SendEmailConfirmationMessageAsync(email);
            return Ok();
        }

        // Ініціює процес відновлення пароля для користувача.
        // Приймає адресу з тіла запиту (JSON { email }) — раніше очікувався query-параметр,
        // тоді як фронтенд завжди надсилав JSON body, через що запит ніколи не доходив до сервісу.
        [HttpPost("password/forgot")]
        public async Task<IActionResult> FogotPassword([FromBody] ForgotPasswordModel model)
        {
            await accountService.FogotPasswordAsync(model.Email);
            return Ok(new { message = "Лист для відновлення паролю надіслано, якщо такий email зареєстрований." });
        }

        // Задає новий пароль після відновлення доступу.
        [HttpPost("password/reset")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordModel resetPasswordModel)
        {
            await accountService.ResetPasswordAsync(resetPasswordModel);
            return Ok(new { message = "Пароль успішно змінено." });
        }

        // Надсилає 6-значний код підтвердження на email поточного користувача (Налаштування профілю).
        [Authorize]
        [HttpPost("send-verification-code")]
        public async Task<IActionResult> SendVerificationCode()
        {
            await accountService.SendEmailVerificationCodeAsync();
            return Ok();
        }

        // Перевіряє 6-значний код і, у разі успіху, підтверджує email поточного користувача.
        [Authorize]
        [HttpPost("verify-email-code")]
        public async Task<IActionResult> VerifyEmailCode([FromBody] VerifyEmailCodeModel model)
        {
            await accountService.VerifyEmailCodeAsync(model.Code);
            return Ok();
        }

        // Оновлює профіль поточного користувача та повертає новий access token.
        // [Authorize] (not Roles = Roles.User): editing your OWN profile has to work for both
        // User and Admin accounts — DbSeeder/AccountService.AddUserAsync only ever grants an
        // account ONE role (Admin xor User), so a logged-in Admin carries no "User" claim.
        // Previously this action always called EditUserAsync(userEditModel) — isAdmin defaulted
        // to false — so when the target account (userEditModel.Id) turned out to be an Admin,
        // AccountService.EditUserAsync's own-role guard threw 403 Forbidden even though the
        // caller WAS that admin editing themselves. We now derive isAdmin from the caller's own
        // role claims (never trust the client for that) and additionally refuse to touch any
        // account other than the caller's own, closing the IDOR that let userEditModel.Id target
        // an arbitrary account.
        [Authorize]
        [HttpPost("edit/user")]
        public async Task<IActionResult> EditUser([FromForm] UserEditModel userEditModel)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (currentUserId is null || userEditModel.Id.ToString() != currentUserId)
            {
                return Forbid();
            }

            var isAdmin = User.IsInRole(Roles.Admin);
            var token = await accountService.EditUserAsync(userEditModel, isAdmin);
            return Ok( new UserEditResponse() { AccessToken = token} );
        }

        // Оновлює профіль адміністратора та повертає новий access token.
        [Authorize(Roles = Roles.Admin)]
        [HttpPost("edit/admin")]
        public async Task<IActionResult> EditAdmin([FromForm] UserEditModel userEditModel)
        {
            var token = await accountService.EditUserAsync(userEditModel,true);
            return Ok(new UserEditResponse() { AccessToken = token });
        }

        // Блокує обліковий запис іншого користувача.
        [Authorize(Roles = Roles.Admin)]
        [HttpPost("block")]
        public async Task<IActionResult> BlockUser([FromBody] UserBlockModel userBlockModel)
        {
            await accountService.BlockUserAsync(userBlockModel);
            return Ok();
        }

        // Додає оголошення до списку улюблених поточного користувача.
        [Authorize]
        [HttpPost("favorites/add/{advertId:int}")]
        public async Task<IActionResult> AddToFavorites([FromRoute] int advertId)
        {
            await accountService.AddToFavoritesAsync(advertId);
            return Ok();
        }

        // Додає кілька оголошень до списку улюблених за один запит.
        [Authorize]
        [HttpPost("favorites/add/range")]
        public async Task<IActionResult> AddToFavoritesRange([FromBody] IEnumerable<int> advertIds)
        {
            await accountService.AddToFavoritesRangeAsync(advertIds);
            return Ok();
        }

        // Перемикає підписку поточного користувача на розсилку/новини (Налаштування профілю).
        [Authorize]
        [HttpPost("subscribe")]
        public async Task<IActionResult> SetNewsletterSubscription([FromBody] NewsletterSubscriptionModel model)
        {
            var subscribed = await accountService.SetNewsletterSubscriptionAsync(model.Subscribed);
            return Ok(new { subscribed });
        }

        // Перевіряє пароль адміністратора перед чутливими діями.
        [Authorize(Roles = Roles.Admin)]
        [HttpPost("password/check")]
        public async Task<IActionResult> CheckPassword([FromBody] CheckPasswordRequest request)
        {
            await accountService.CheckPasswordAsync(request.Password);
            return Ok();
        }

        // Створює нового адміністратора.
        [Authorize(Roles = Roles.Admin)]
        [HttpPut("register/admin")]
        public async Task<IActionResult> AddAdmin([FromForm] UserCreationModel adminModel)
        {
            await accountService.AddUserAsync(adminModel,true);
            return Ok();
        }

        // Реєструє нового звичайного користувача та одразу автентифікує його (як /login):
        // повертає access token у тілі відповіді та refresh token — у HttpOnly cookie.
        [HttpPut("register/user")]
        public async Task<IActionResult> AddUser([FromForm] UserCreationModel userModel)
        {
            var authResponse = await accountService.AddUserAsync(userModel);
            if (authResponse is null)
            {
                return Ok();
            }
            SetRefreshTokenCookie(authResponse.RefreshToken);
            return Ok(new AccessTokenResponse { AccessToken = authResponse.AccessToken });
        }
        
        // Видаляє оголошення зі списку улюблених поточного користувача.
        [Authorize]
        [HttpDelete("favorites/remove/{advertId:int}")]
        public async Task<IActionResult> RemoveFromFavorites([FromRoute] int advertId)
        {
            await accountService.RemoveFromFavoritesAsync(advertId);
            return Ok();
        }

        // Видаляє обліковий запис за вказаним ідентифікатором.
        [Authorize]
        [HttpDelete("delete")]
        public async Task<IActionResult> RemoveAccount([FromQuery] int id)
        {
            await accountService.RemoveAccountAsync(id);
            return Ok();
        }



        // Sets the rotation refresh token as a browser-inaccessible cookie: HttpOnly blocks
        // JS/XSS access, Secure restricts transport to HTTPS, SameSite=Strict blocks CSRF by
        // never attaching the cookie to cross-site requests. The JWT access token is returned
        // in the JSON body separately and is short-lived by design.
        private void SetRefreshTokenCookie(string refreshToken)
        {
            var days = configuration.GetValue<double>("JwtOptions:RefreshTokenLifeTimeInDays");
            Response.Cookies.Append(_refreshTokenCookiesName, refreshToken, new CookieOptions
            {
                IsEssential = true,
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Path = RefreshTokenCookiePath,
                Expires = DateTimeOffset.UtcNow.AddDays(days)
            });
        }

        private void DeleteRefreshTokenCookie()
        {
            Response.Cookies.Delete(_refreshTokenCookiesName, new CookieOptions
            {
                Path = RefreshTokenCookiePath
            });
        }
    }
}
