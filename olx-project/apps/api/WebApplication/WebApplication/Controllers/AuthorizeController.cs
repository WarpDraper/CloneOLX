
using AuthBLL.EmailService;
using Domain;
using AutoMapper;
using BLL.AuthService;
using BLL.DTO.Authorize;
using BLL.JwtToken;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using OLXCLONE.DTO.Authorize;
using System.Diagnostics;
using System.Formats.Asn1;
using System.Security.Claims;
using static System.Runtime.InteropServices.JavaScript.JSType;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace WebApplication25.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthorizeController : ControllerBase
    {

        private readonly ILogger<AuthorizeController> _logger;
        private readonly IAuthService _authService;
        public AuthorizeController(ILogger<AuthorizeController> logger,IAuthService authService)
        {
            _logger = logger;
            _authService = authService;
        }
        [AllowAnonymous]
        [HttpPost("regist")]
        public async Task<IActionResult> Regist([FromBody] RegisterDto value)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            _logger.LogInformation("Реєстрація нового користувача: {Email}", value.Email);

            var result = await _authService.RegisterAsync(value);

            if (result)
                return Ok(new { Message = "Реєстрація успішна. Перевірте пошту для підтвердження." });

            _logger.LogWarning("Невдала спроба реєстрації: {Email}", value.Email);
            return BadRequest(new { Message = "Помилка реєстрації. Можливо, такий Email вже існує." });
        }

        /// <summary>
        /// Реєстрація з верифікацією reCaptcha v3
        /// </summary>
        [AllowAnonymous]
        [HttpPost("regist-captcha")]
        public async Task<IActionResult> RegistWithCaptcha([FromBody] RegisterDto value, [FromQuery] string recaptchaToken)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            if (string.IsNullOrEmpty(recaptchaToken))
                return BadRequest(new { Message = "reCaptcha токен відсутній" });

            _logger.LogInformation("Реєстрація нового користувача з reCaptcha: {Email}", value.Email);

            var result = await _authService.RegisterAsync(value, recaptchaToken);

            if (result)
                return Ok(new { Message = "Реєстрація успішна. Перевірте пошту для підтвердження." });

            _logger.LogWarning("Невдала спроба реєстрації з reCaptcha: {Email}", value.Email);
            return BadRequest(new { Message = "Помилка реєстрації. Рекаптча не пройшла перевірку або Email вже існує." });
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto value)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            _logger.LogInformation("Спроба входу: {Email}", value.Email);

            var result = await _authService.LoginAsync(value);

            if (!result.IsSuccess)
            {
                _logger.LogWarning("Вхід не вдався для {Email}: {Message}", value.Email, result.Message);

                // Якщо заблоковано через перебір паролів (Lockout)
                if (result.Message != null && result.Message.Contains("заблоковано"))
                    return StatusCode(403, new { Message = result.Message });

                return Unauthorized(new { Message = result.Message });
            }

            _logger.LogInformation("Користувач {Email} успішно увійшов", value.Email);

            return Ok(new
            {
                Token = result.Token,
                RefreshToken = result.RefreshToken,
                Email = value.Email
            });
        }

        /// <summary>
        /// Вхід з верифікацією reCaptcha v3
        /// </summary>
        [AllowAnonymous]
        [HttpPost("login-captcha")]
        public async Task<IActionResult> LoginWithCaptcha([FromBody] LoginDto value, [FromQuery] string recaptchaToken)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            if (string.IsNullOrEmpty(recaptchaToken))
                return BadRequest(new { Message = "reCaptcha токен відсутній" });

            _logger.LogInformation("Спроба входу з reCaptcha: {Email}", value.Email);

            var result = await _authService.LoginAsync(value, recaptchaToken);

            if (!result.IsSuccess)
            {
                _logger.LogWarning("Вхід з reCaptcha не вдався для {Email}: {Message}", value.Email, result.Message);

                if (result.Message != null && result.Message.Contains("заблоковано"))
                    return StatusCode(403, new { Message = result.Message });

                return Unauthorized(new { Message = result.Message });
            }

            _logger.LogInformation("Користувач {Email} успішно увійшов з reCaptcha", value.Email);

            return Ok(new
            {
                Token = result.Token,
                RefreshToken = result.RefreshToken,
                Email = value.Email
            });
        }


        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenDto model)
        {
            var result = await _authService.RefreshTokenAsync(model);
            if (!result.IsSuccess) return Unauthorized(result.Message);

            return Ok(new
            {
                token = result.Token,
                refreshToken = result.RefreshToken
            });
        }

        [HttpGet("confirm-email")]
        public async Task<IActionResult> ConfirmEmail(string userId, string token)
        {
            var success = await _authService.ConfirmEmailAsync(userId, token);
            if (success) return Ok(new { Message = "Email підтверджено!" });

            return BadRequest(new { Message = "Помилка підтвердження" });
        }


        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto model)
        {
            await _authService.ForgotPasswordAsync(model);
            return Ok(new { Message = "Якщо пошта існує, лист для скидання відправлено." });
        }

        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto model)
        {
            var result = await _authService.ResetPasswordAsync(model);
            if (!result.IsSuccess) return BadRequest(result.Message);

            return Ok(new { Message = result.Message });
        }

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto model)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var result = await _authService.ChangePasswordAsync(userId, model);

            if (!result.IsSuccess) return BadRequest(result.Message);

            return Ok(new { Message = result.Message });
        }

        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var result = await _authService.LogoutAsync(userId!);
            return result.IsSuccess ? Ok(result) : BadRequest(result);
        }

        [Authorize]
        [HttpDelete("delete-account")]
        public async Task<IActionResult> DeleteAccount()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var result = await _authService.DeleteAccountAsync(userId!);
            return result.IsSuccess ? Ok(result) : BadRequest(result);
        }
        [AllowAnonymous]
        [HttpPost("google-login")]
        public async Task<IActionResult> GoogleLogin([FromBody] ExternalAuthDto model)
        {
            var result = await _authService.GoogleLoginAsync(model);

            if (!result.IsSuccess)
                return BadRequest(new { Message = result.Message });

            return Ok(new
            {
                Token = result.Token,
                RefreshToken = result.RefreshToken,
                Email = result.Email
            });
        }
        [Authorize]
        [HttpPut("update-profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto model)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var result = await _authService.UpdateProfileAsync(userId!, model);

            if (!result.IsSuccess) return BadRequest(result.Message);
            return Ok(result);
        }
        [Authorize]
        [HttpPost("update-avatar")]
        public async Task<IActionResult> UpdateAvatar(IFormFile file)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var result = await _authService.UpdateAvatarAsync(userId!, file);

            if (!result.IsSuccess) return BadRequest(result.Message);
            return Ok(new { AvatarUrl = result.Email });
        }
    }
}
