
using AuthBLL.EmailService;
using AuthDomain;
using AutoMapper;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Diagnostics;
using System.Formats.Asn1;
using System.Security.Claims;
using static System.Runtime.InteropServices.JavaScript.JSType;
using OnlineLibrary_BookKey.DTO.Authorize;
using BLL.JwtToken;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace WebApplication25.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthorizeController : ControllerBase
    {
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _usermanager;
        private readonly TokenService _tokenService;
        private readonly IEmailService _emailService;
        private readonly IMapper _mapper;
        private readonly ILogger<AuthorizeController> _logger;
        public AuthorizeController(TokenService tokenServ,UserManager<ApplicationUser> userManag, SignInManager<ApplicationUser> sign,
            IEmailService email,IMapper map,ILogger<AuthorizeController> logger)
        {
            _tokenService = tokenServ;
            _usermanager = userManag;
            _signInManager = sign;
            _emailService = email;
            _mapper = map;
            _logger = logger;
        }
        // POST api/<AuthorizeController>
        [AllowAnonymous]
        [HttpPost("regist")]
        public async Task<IActionResult> Regist([FromBody] RegisterDto value)
        {
            try
            {
              
                if (ModelState.IsValid)
                {
                    _logger.LogInformation("Register user email {Email}", value.Email);
                    var user = _mapper.Map<ApplicationUser>(value);
                    user.RefreshToken = _tokenService.CreateRefreshToken();
                    user.RefreshTokenExpiryTime = DateTime.Now.AddDays(7);
                    var result = await _usermanager.CreateAsync(user, value.Password);
                    if (result.Succeeded)
                    {
                        // _usermanager.AddToRoleAsync(user, "user").Wait();
                        var token_ = await _usermanager.GenerateEmailConfirmationTokenAsync(user);
                        //await _usermanager.UpdateAsync(user);
                        var conf = Url.Action("ConfirmEmail", "Authorize", new { userId = user.Id, token = token_ }, Request.Scheme);
                        await _emailService.SendEmailAsync(value.Email, "Email code Authorize", conf);
                        // var jwt = _tokenService.CreateToken(user);
                        return Ok(new {Message = "Register check your email" });
                        //статус код 200
                    }
                    else
                    {
                        _logger.LogWarning("Warn register email {Email}", value.Email);
                        foreach (var error in result.Errors)
                        {
                            Debug.WriteLine($"{error.Description}");
                        }
                        return BadRequest();//(статус код 400 поверне) ControllerBase 
                    }
                }
            }
            catch (Exception ex) {
                _logger.LogError("Error register email {Email}", value.Email);
                Debug.WriteLine(ex);
            }
            _logger.LogError("Error register ");
            return BadRequest(ModelState);//(статус код, тут поверне помилку саму) ControllerBase 
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto value)
        {
            try
            {
                if (ModelState.IsValid)
                {
                    var findUser = await _usermanager.FindByEmailAsync(value.Email);
                    if (findUser == null)
                    {
                        _logger.LogWarning("Warn login  invalid ");
                        return Unauthorized(new { Message = "Invalid login."});
                    }
                    else
                    {
                        if (!await _usermanager.IsEmailConfirmedAsync(findUser))
                        {//якщо юсер не пітверджений
                            _logger.LogInformation("Login send repetition to {Email}", value.Email);
                            var token_ = await _usermanager.GenerateEmailConfirmationTokenAsync(findUser);
                            var conf = Url.Action("ConfirmEmail", "Authorize", new { userId = findUser.Id, token = token_ }, Request.Scheme);
                            await _emailService.SendEmailAsync(value.Email, "Email code Authorize", conf);
                            return Unauthorized(new {Message = "Check your Email"});
                        }
                    }
                    _logger.LogInformation("Login - Check Password to  {Email}", value.Email);
                    var result = await _signInManager.PasswordSignInAsync(findUser, value.Password, false, false);
                    if (result.Succeeded)
                    {
                      
                        findUser.RefreshToken = _tokenService.CreateRefreshToken();
                        findUser.RefreshTokenExpiryTime = DateTime.Now.AddDays(7);
                        var updateRez = await _usermanager.UpdateAsync(findUser);
                        await _signInManager.PasswordSignInAsync(findUser, value.Password, false, false);
                        var claims = new List<Claim>
                        {
                            new Claim(ClaimTypes.NameIdentifier , findUser.Id),
                            new Claim(ClaimTypes.Name, findUser.UserName)
                        };
                        var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
                        await HttpContext.SignInAsync(
                            CookieAuthenticationDefaults.AuthenticationScheme,
                            new ClaimsPrincipal(claimsIdentity));
                        var token_ = _tokenService.CreateTokenAsync(findUser);
                        _logger.LogInformation("Login good, send token for user  {Email}", value.Email);
                        return Ok(new { Token = token_, RefreshToken = findUser.RefreshToken, Email = findUser.Email, Name = findUser.UserName, Expiress = DateTime.Now.AddMinutes(15) });
                    }
                    else
                    {
                        _logger.LogWarning("Warn Invalid login ");
                        return Unauthorized(new { Message = "Invalid login." });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError("Error login -  email: {Email}", value.Email);
                Debug.WriteLine(ex);
            }
            _logger.LogError("Error login ");
            return BadRequest(ModelState);
        }


        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenDto tokenRefresh)//дата клієнта
        {//треба пройти саму авторизацію (Authorize)
            var principal = _tokenService.GetPrincopalFromExpiredToken(tokenRefresh.Token);//витяг даних з старого JWT
            var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
            var findUser = await _usermanager.FindByIdAsync(userId);
            if (findUser == null)
            {
                _logger.LogWarning("Warn Invalid refresh token ");
                return Unauthorized(new { Message = "Invalid refresh token"});
            }
            if(findUser.RefreshToken != tokenRefresh.RefreshToken || findUser.RefreshTokenExpiryTime <= DateTime.Now)
            {
                _logger.LogWarning("Warn Invalid refresh token ");
                return Unauthorized(new { Message = "Invalid refresh token" });
            }
            _logger.LogInformation("Refresh token create for user ");
            var newToken = _tokenService.CreateTokenAsync(findUser);
            var newRefreshToken = _tokenService.CreateRefreshToken();

            findUser.RefreshToken = newRefreshToken;
            findUser.RefreshTokenExpiryTime = DateTime.Now.AddDays(7);

            var result = await _usermanager.UpdateAsync(findUser);

            if (!result.Succeeded) {
                _logger.LogWarning("Warn fail Refresh Token update user ");
                return BadRequest(new { Message = "Fail to update user" });
            }
            _logger.LogInformation("Refresh token create went well");
            return Ok(new {Token = newToken,RefreshToken = newRefreshToken,Email = findUser.Email,Name = findUser.UserName,ExpiresAs = DateTime.Now.AddMinutes(15)});
        }


        [HttpGet("confirm-email")]
        [AllowAnonymous]
        public async Task<IActionResult> ConfirmEmail(string userId, string token)
        {
            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(token))
            {
                _logger.LogWarning("Warn confirm email fail email user");
                return BadRequest(new { Message = "Fail email  check" });
            }
            var user = await _usermanager.FindByIdAsync(userId);
            if (user == null)
            {
                _logger.LogWarning("Warn confirm email not found user ");
                return NotFound(new { Message = "Not found id user " });
            }

            var RES = await _usermanager.ConfirmEmailAsync(user, token);

            if (RES.Succeeded)
            {//одразу пітверджує
             // await _signInManager.SignInAsync(user, false);
                _logger.LogInformation("Confirm email for email {Email}",user.Email);
                return Ok(new {Message ="Email confirmation good" });
            }
            _logger.LogWarning("Warn Email confirmation fail ");
            return BadRequest(new { Message = "Email confirmation fail " });
        }





        [AllowAnonymous]
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody]ForgotPasswordDto forgotModel)
        {
            if (ModelState.IsValid)
            {
                var user = await _usermanager.FindByEmailAsync(forgotModel.Email);
                if(user == null || !await _usermanager.IsEmailConfirmedAsync(user))
                {
                    _logger.LogWarning("Warn you register now ");
                    return Ok(new {Message="if you register" });
                }
                _logger.LogInformation("Send message an email for ForgotPassword: {Email}", user.Email);
                var token = await _usermanager.GeneratePasswordResetTokenAsync(user);
                await _emailService.SendEmailAsync(forgotModel.Email,"Reset password token",JsonConvert.SerializeObject(new { Token = token }));

                return Ok(new { Message = "If the email " });
            }
            _logger.LogError("Error model password or token");
            return BadRequest(ModelState);
        }
        [AllowAnonymous]
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody]ResetPasswordDto resetModel)
        {
            if (ModelState.IsValid)
            {
                var user = await _usermanager.FindByEmailAsync(resetModel.Email);
                if (user != null)
                {
                    _logger.LogInformation("Reset password check: {Email}", user.Email);
                    var res = await _usermanager.ResetPasswordAsync(user, resetModel.Token, resetModel.NewPassword);
                    if (res.Succeeded)
                    {
                        _logger.LogInformation("Good reset password for {Email}", user.Email);
                        return Ok(new {Message = "good reset password"});
                    }
                }
                _logger.LogWarning("Warn fail reset password ");
                return BadRequest(new { Message = "failed reset password" });
            }
            _logger.LogError("Error reset password");
            return BadRequest(ModelState);
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody]ChangePasswordDto ChangeModel)
        {
            if (ModelState.IsValid)
            {
                var user = await _usermanager.GetUserAsync(User);
                if (user != null)
                {
                    _logger.LogInformation("Start change password for {Email}", user.Email);
                    var res = await _usermanager.ChangePasswordAsync(user, ChangeModel.CurrentPassword, ChangeModel.NewPassword);
                    if (res.Succeeded)
                    {
                        _logger.LogInformation("Good change password for {Email}", user.Email);
                        return Ok(new { Message = "Password good changed" });
                    }
                    foreach (var error in res.Errors)
                    {
                        _logger.LogWarning("Warn error: {Error} ", error.Description);
                        Debug.WriteLine($"{error.Description}");
                    }
                }
            }
            _logger.LogError("Error change password");
            return BadRequest(ModelState);
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            var user = await _usermanager.GetUserAsync(User);
            if (user == null) {
                _logger.LogWarning("Warn not found user");
                return NotFound(new { Message = "User not found" });
            }
            user.RefreshToken = null;
            user.RefreshTokenExpiryTime = DateTime.Now.AddDays(-1);
            var res = await _usermanager.UpdateAsync(user);
            if (!res.Succeeded)
            {
                _logger.LogWarning("Warn error update logout");
                return BadRequest();
            }
            _logger.LogInformation("Good logout {Email}", user.Email);
            return Ok(new { Message = "You logout account" });
        }


        [HttpPost("delete-account")]
        [Authorize]
        public async Task<IActionResult> DeleteThisAccount()
        {
            var user = await _usermanager.GetUserAsync(User);
            if (user == null)
            {
                return NotFound(new { Message = "User not found" });
            }
            user.RefreshToken = null;
            user.RefreshTokenExpiryTime = DateTime.Now.AddDays(-1);
            var res = await _usermanager.UpdateAsync(user);
            await _usermanager.DeleteAsync(user);
            if (!res.Succeeded)
            {
                return BadRequest();
            }
            return Ok(new { Message = "You delete account" });
        }

    }
}
