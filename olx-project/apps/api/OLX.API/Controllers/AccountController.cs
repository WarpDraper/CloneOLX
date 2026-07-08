using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Olx.BLL.Helpers;
using Olx.BLL.Interfaces;
using Olx.BLL.Models;
using Olx.BLL.Models.Authentication;
using Olx.BLL.Models.User;


namespace OLX.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // Контролер облікових операцій: надає API для входу, реєстрації, профілю та управління улюбленими оголошеннями.
    public class AccountController(IAccountService accountService) : ControllerBase
    {
       // private readonly string _refreshTokenCookiesName = configuration["RefreshTokenCookiesName"]!;

        // Повертає список улюблених оголошень поточного користувача.
        [Authorize(Roles = Roles.User)]
        [HttpGet("favorites")]
        public async Task<IActionResult> GetFavorites()
        {
            var favorites = await accountService.GetFavoritesAsync();
            return Ok(favorites);
        }

        // Аутентифікує користувача за email/паролем і повертає токени доступу.
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] AuthRequest model )
        {
            var authResponse = await accountService.LoginAsync(model);
          //  SetHttpOnlyCookies(authResponse.RefreshToken);
            return Ok(authResponse);
        }

        // Аутентифікує користувача через Google access token.
        [HttpPost("login/google")]
        public async Task<IActionResult> GoogleLogin([FromQuery] string googleAccessToken)
        {
            var authResponse = await accountService.GoogleLoginAsync(googleAccessToken);
           // SetHttpOnlyCookies(authResponse.RefreshToken);
            return Ok(authResponse);
        }

        // Виходить із системи й анулює refresh token, якщо він надійшов.
        [HttpPost("user/logout")]
        public async Task<IActionResult> LogOut([FromBody] LogoutModel? logoutModel)
        {
            //Console.WriteLine("Refresh token: " + logoutModel?.RefreshToken);
            //if (Request.Cookies.TryGetValue(_refreshTokenCookiesName, out var token))
            //{
            //    Response.Cookies.Delete(_refreshTokenCookiesName);
            //    await accountService.LogoutAsync(token);
            //}
            //else 
            if (logoutModel is not null && logoutModel.RefreshToken is not null)
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
            //if (Request.Cookies.TryGetValue(_refreshTokenCookiesName, out var httpToken))
            //{
            //    token = httpToken;
            //}
            //else
            if (refreshRequest is not null && refreshRequest.RefreshToken is not null)
            {
                token = refreshRequest.RefreshToken;
            }
            else return Unauthorized();
            var authResponse = await accountService.RefreshTokensAsync(token);
            //SetHttpOnlyCookies(authResponse.RefreshToken);
            return Ok(authResponse);
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
        [HttpPost("password/fogot")]
        public async Task<IActionResult> FogotPassword([FromQuery] string email)
        {
            await accountService.FogotPasswordAsync(email);
            return Ok();
        }

        // Задає новий пароль після відновлення доступу.
        [HttpPost("password/reset")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordModel resetPasswordModel)
        {
            await accountService.ResetPasswordAsync(resetPasswordModel);
            return Ok();
        }

        // Оновлює профіль поточного користувача та повертає новий access token.
        [Authorize(Roles = Roles.User)]
        [HttpPost("edit/user")]
        public async Task<IActionResult> EditUser([FromForm] UserEditModel userEditModel)
        {
             var token = await accountService.EditUserAsync(userEditModel);
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
        [Authorize(Roles = Roles.User)]
        [HttpPost("favorites/add/{advertId:int}")]
        public async Task<IActionResult> AddToFavorites([FromRoute] int advertId)
        {
            await accountService.AddToFavoritesAsync(advertId);
            return Ok();
        }

        // Додає кілька оголошень до списку улюблених за один запит.
        [Authorize(Roles = Roles.User)]
        [HttpPost("favorites/add/range")]
        public async Task<IActionResult> AddToFavoritesRange([FromBody] IEnumerable<int> advertIds)
        {
            await accountService.AddToFavoritesRangeAsync(advertIds);
            return Ok();
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

        // Реєструє нового звичайного користувача.
        [HttpPut("register/user")]
        public async Task<IActionResult> AddUser([FromForm] UserCreationModel userModel)
        {
            await accountService.AddUserAsync(userModel);
            return Ok();
        }
        
        // Видаляє оголошення зі списку улюблених поточного користувача.
        [Authorize(Roles = Roles.User)]
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

        

        //private void SetHttpOnlyCookies(string token)
        //{
        //    var days = double.Parse(configuration["JwtOptions:RefreshTokenLifeTimeInDays"]!);
        //    Response.Cookies.Append(_refreshTokenCookiesName, token, new CookieOptions
        //    {
        //        IsEssential = true,
        //        //  HttpOnly = true,
        //        //Domain = "localhost",
        //     //   SameSite = SameSiteMode.Strict,
        //     //   Secure = true,
        //        Path = "api/Account/user",
        //        Expires = DateTime.UtcNow.AddDays(days)
        //    });
        //}
    }
}
