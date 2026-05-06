using AuthBLL.EmailService;
using Domain;
using BLL.DTO.Authorize;
using BLL.JwtToken;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using OLXCLONE.DTO.Authorize;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text;

namespace BLL.AuthService
{
    public class AuthService : IAuthService
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly SignInManager<AppUser> _signInManager;
        private readonly ITokenService _jwtService;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;

        public AuthService(
        UserManager<AppUser> userManager,
        SignInManager<AppUser> signInManager,
        ITokenService jwtService,
        IEmailService emailService,
        IConfiguration configuration)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _jwtService = jwtService;
            _emailService = emailService;
            _configuration = configuration;
        }

        public async Task<bool> RegisterAsync(RegisterDto model)
        {
            var user = new AppUser
            {
                Email = model.Email,
                UserName = model.Email,
                CreatedAt = DateTime.UtcNow
            };

            var result = await _userManager.CreateAsync(user, model.Password);

            if (result.Succeeded)
            {
                // Відразу даємо роль звичайного юзера
                await _userManager.AddToRoleAsync(user, "User");
                return true;
            }
            return false;
        }
        public async Task<AuthResultDto> LoginAsync(LoginDto model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null) return AuthResultDto.Fail("Юзера не існує");

            // lockoutOnFailure: true — це вмикає лічильник спроб
            var result = await _signInManager.CheckPasswordSignInAsync(user, model.Password, lockoutOnFailure: true);

            if (result.IsLockedOut)
            {
                return AuthResultDto.Fail("Акаунт заблоковано на 15 хвилин через перебір паролів");
            }

            if (!result.Succeeded)
            {
                return AuthResultDto.Fail("Невірний пароль");
            }

            var token = await _jwtService.CreateTokenAsync(user);

            return AuthResultDto.Success(token, user.RefreshToken, user.Email);
        }

        public async Task<AuthResultDto> RefreshTokenAsync(RefreshTokenDto model)
        {

            var principal = _jwtService.GetPrincopalFromExpiredToken(model.Token);
            var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (userId == null) return AuthResultDto.Fail("Невірний токен");

            var user = await _userManager.FindByIdAsync(userId);

            if (user == null || user.RefreshToken != model.RefreshToken || user.RefreshTokenExpiryTime <= DateTime.Now)
            {
                return AuthResultDto.Fail("Refresh токен недійсний або протермінований");
            }

            var newToken = await _jwtService.CreateTokenAsync(user);
            var newRefreshToken = _jwtService.CreateRefreshToken();

            user.RefreshToken = newRefreshToken;
            await _userManager.UpdateAsync(user);

            return AuthResultDto.Success(newToken, newRefreshToken);
        }

        public async Task<bool> ConfirmEmailAsync(string userId, string token)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return false;

            var result = await _userManager.ConfirmEmailAsync(user, token);
            return result.Succeeded;
        }

        public async Task<bool> ForgotPasswordAsync(ForgotPasswordDto model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null || !(await _userManager.IsEmailConfirmedAsync(user))) return true;

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);

            await _emailService.SendEmailAsync(user.Email!, "Скидання пароля", $"Ваш токен: {token}");
            return true;
        }

        public async Task<AuthResultDto> ResetPasswordAsync(ResetPasswordDto model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null) return AuthResultDto.Fail("Помилка скидання пароля.");

            var result = await _userManager.ResetPasswordAsync(user, model.Token, model.NewPassword);

            if (result.Succeeded) return AuthResultDto.Success("Пароль змінено успішно.");

            return AuthResultDto.Fail(result.Errors.FirstOrDefault()?.Description ?? "Помилка");
        }

        public async Task<AuthResultDto> ChangePasswordAsync(string userId, ChangePasswordDto model)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return AuthResultDto.Fail("Користувача не знайдено.");

            var result = await _userManager.ChangePasswordAsync(user, model.CurrentPassword, model.NewPassword);

            if (result.Succeeded) return AuthResultDto.Success("Пароль оновлено.");

            return AuthResultDto.Fail(result.Errors.FirstOrDefault()?.Description ?? "Помилка зміни пароля");
        }
        public async Task<AuthResultDto> LogoutAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return AuthResultDto.Fail("Користувача не знайдено");

            // Обнуляємо токени, щоб сесія стала недійсною
            user.RefreshToken = null;
            user.RefreshTokenExpiryTime = DateTime.Now.AddDays(-1);

            await _userManager.UpdateAsync(user);
            return AuthResultDto.Success("Ви вийшли з системи");
        }

        public async Task<AuthResultDto> DeleteAccountAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return AuthResultDto.Fail("Користувача не знайдено");

            var result = await _userManager.DeleteAsync(user);

            if (!result.Succeeded) return AuthResultDto.Fail("Не вдалося видалити акаунт");

            return AuthResultDto.Success("Акаунт видалено назавжди");
        }

        public async Task<AuthResultDto> GoogleLoginAsync(ExternalAuthDto model)
        {
            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new List<string> { _configuration["Google:ClientId"]! }
                };

                var payload = await GoogleJsonWebSignature.ValidateAsync(model.IdToken, settings);

                var user = await _userManager.FindByEmailAsync(payload.Email);

                if (user == null)
                {
                    user = new AppUser
                    {
                        Email = payload.Email,
                        UserName = payload.Email,
                        AvatarUrl = payload.Picture,
                        EmailConfirmed = true,
                        CreatedAt = DateTime.UtcNow
                    };

                    var createResult = await _userManager.CreateAsync(user);
                    if (!createResult.Succeeded) return AuthResultDto.Fail("Помилка створення юзера через Google");

                    await _userManager.AddToRoleAsync(user, "User");
                }

                var token = await _jwtService.CreateTokenAsync(user);

                user.RefreshToken = _jwtService.CreateRefreshToken();
                user.RefreshTokenExpiryTime = DateTime.Now.AddDays(7);
                await _userManager.UpdateAsync(user);

                return AuthResultDto.Success(token, user.RefreshToken, user.Email);
            }
            catch (Exception)
            {
                return AuthResultDto.Fail("Недійсний Google токен");
            }
        }
        public async Task<AuthResultDto> UpdateProfileAsync(string userId, UpdateProfileDto model)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return AuthResultDto.Fail("Користувача не знайдено");

            user.PhoneNumber = model.PhoneNumber ?? user.PhoneNumber;
            user.Location = model.City ?? user.Location;

            var result = await _userManager.UpdateAsync(user);

            if (!result.Succeeded) return AuthResultDto.Fail("Помилка при оновленні профілю");

            return AuthResultDto.Success("Профіль успішно оновлено");
        }
        public async Task<AuthResultDto> UpdateAvatarAsync(string userId, IFormFile file)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return AuthResultDto.Fail("Користувача не знайдено");

            if (file == null || file.Length == 0) return AuthResultDto.Fail("Файл порожній");

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png" };
            var extension = Path.GetExtension(file.FileName).ToLower();
            if (!allowedExtensions.Contains(extension))
                return AuthResultDto.Fail("Дозволені тільки .jpg, .jpeg, .png");
            var folderPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "avatars");
            if (!Directory.Exists(folderPath)) Directory.CreateDirectory(folderPath);

            var fileName = $"{userId}_{DateTime.UtcNow.Ticks}{extension}";
            var filePath = Path.Combine(folderPath, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            if (!string.IsNullOrEmpty(user.AvatarUrl) && !user.AvatarUrl.StartsWith("http"))
            {
                var oldPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", user.AvatarUrl.TrimStart('/'));
                if (System.IO.File.Exists(oldPath)) System.IO.File.Delete(oldPath);
            }

            user.AvatarUrl = $"/uploads/avatars/{fileName}";
            await _userManager.UpdateAsync(user);

            return AuthResultDto.Success("Аватар оновлено", email: user.AvatarUrl);
        }
    }
}
