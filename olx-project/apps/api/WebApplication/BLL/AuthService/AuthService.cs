using AuthBLL.EmailService;
using Domain;
using BLL.DTO.Authorize;
using BLL.JwtToken;
using BLL.NotificationService;
using BLL.RecaptchaService;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using OLXCLONE.DTO.Authorize;
using System.Security.Claims;
using Microsoft.Extensions.Logging;


namespace BLL.AuthService
{
    public class AuthService : IAuthService
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly SignInManager<AppUser> _signInManager;
        private readonly ITokenService _jwtService;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;
        private readonly IRecaptchaService _recaptchaService;
        private readonly INotificationService _notificationService;
        private readonly ILogger<AuthService> _logger;

        public AuthService(
        UserManager<AppUser> userManager,
        SignInManager<AppUser> signInManager,
        ITokenService jwtService,
        IEmailService emailService,
        IConfiguration configuration,
        IRecaptchaService recaptchaService,
        INotificationService notificationService,
        ILogger<AuthService> logger)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _jwtService = jwtService;
            _emailService = emailService;
            _configuration = configuration;
            _recaptchaService = recaptchaService;
            _notificationService = notificationService;
            _logger = logger;
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

        public async Task<bool> RegisterAsync(RegisterDto model, string recaptchaToken)
        {
            // Верифікація reCaptcha перед реєстрацією
            var isValidCaptcha = await _recaptchaService.VerifyTokenAsync(
                recaptchaToken, 
                "register",
                minScore: 0.7f);

            if (!isValidCaptcha)
            {
                _logger.LogWarning($"reCaptcha verification failed for registration: {model.Email}");
                return false;
            }

            return await RegisterAsync(model);
        }

        public async Task<AuthResultDto> LoginAsync(LoginDto model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                _logger.LogWarning($"Login attempt for non-existent user: {model.Email}");
                return AuthResultDto.Fail("Юзера не існує");
            }

            // Перевірка локауту
            if (await _userManager.IsLockedOutAsync(user))
            {
                var lockoutEnd = await _userManager.GetLockoutEndDateAsync(user);
                var remainingTime = lockoutEnd?.UtcDateTime.Subtract(DateTime.UtcNow) ?? TimeSpan.Zero;
                
                _logger.LogWarning($"Login attempt for locked out user: {model.Email}. Remaining time: {remainingTime.Minutes} minutes");
                return AuthResultDto.Fail(
                    $"Акаунт заблоковано на {remainingTime.Minutes} хвилин через перебір паролів");
            }

            // Перевірка банованого користувача
            if (user.IsBanned)
            {
                _logger.LogWarning($"Banned user login attempt: {model.Email}");
                return AuthResultDto.Fail($"Ваш акаунт забанено. Причина: {user.BanReason}");
            }

            // lockoutOnFailure: true — це вмикає лічильник спроб
            var result = await _signInManager.CheckPasswordSignInAsync(user, model.Password, lockoutOnFailure: true);

            if (result.IsLockedOut)
            {
                _logger.LogWarning($"Account locked out during login: {model.Email}");
                return AuthResultDto.Fail("Акаунт заблоковано на 15 хвилин через перебір паролів");
            }

            if (!result.Succeeded)
            {
                _logger.LogWarning($"Failed login attempt for {model.Email}");
                return AuthResultDto.Fail("Невірний пароль");
            }

            // Успішний вхід - скидання лічильника невдалих спроб
            await _userManager.ResetAccessFailedCountAsync(user);

            // Генеруємо токени
            var token = await _jwtService.CreateTokenAsync(user);
            var refreshToken = _jwtService.CreateRefreshToken();

            // Зберігаємо Refresh Token та його строк дії
            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
            await _userManager.UpdateAsync(user);

            _logger.LogInformation($"Successful login for {model.Email}");
            return AuthResultDto.Success(token, refreshToken, user.Email);
        }

        public async Task<AuthResultDto> LoginAsync(LoginDto model, string recaptchaToken)
        {
            // reCaptcha верифікація перед логіном
            var isValidCaptcha = await _recaptchaService.VerifyTokenAsync(
                recaptchaToken, 
                "login",
                minScore: 0.5f);

            if (!isValidCaptcha)
            {
                _logger.LogWarning($"reCaptcha verification failed for login: {model.Email}");
                return AuthResultDto.Fail("reCaptcha верифікація не вдалась");
            }

            return await LoginAsync(model);
        }

        public async Task<AuthResultDto> RefreshTokenAsync(RefreshTokenDto model)
        {
            try
            {
                var principal = _jwtService.GetPrincipalFromExpiredToken(model.Token);
                var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);

                if (userId == null)
                {
                    _logger.LogWarning("Invalid token in refresh request");
                    return AuthResultDto.Fail("Невірний токен");
                }

                var user = await _userManager.FindByIdAsync(userId);

                if (user == null)
                {
                    _logger.LogWarning($"User not found during refresh: {userId}");
                    return AuthResultDto.Fail("Користувача не знайдено");
                }

                if (user.IsBanned)
                {
                    _logger.LogWarning($"Banned user attempted token refresh: {user.Email}");
                    return AuthResultDto.Fail("Ваш акаунт забанено");
                }

                if (user.RefreshToken != model.RefreshToken || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
                {
                    _logger.LogWarning($"Invalid refresh token for user: {user.Email}");
                    return AuthResultDto.Fail("Refresh токен недійсний або протермінований");
                }

                // Генеруємо новий Access Token та новий Refresh Token (Token Rotation)
                var newToken = await _jwtService.CreateTokenAsync(user);
                var newRefreshToken = _jwtService.CreateRefreshToken();

                // Оновлюємо Refresh Token та його строк дії
                user.RefreshToken = newRefreshToken;
                user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);

                var result = await _userManager.UpdateAsync(user);
                if (!result.Succeeded)
                {
                    _logger.LogError($"Failed to update refresh token for user: {user.Email}");
                    return AuthResultDto.Fail("Помилка при оновленні токена");
                }

                _logger.LogInformation($"Refresh token rotated successfully for user: {user.Email}");
                return AuthResultDto.Success(newToken, newRefreshToken);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error during token refresh: {ex.Message}");
                return AuthResultDto.Fail("Помилка при оновленні токена");
            }
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

            if (result.Succeeded)
            {
                await _notificationService.NotifyPasswordChangeAsync(user.Id);
                return AuthResultDto.Success("Пароль оновлено.");
            }

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
            try
            {
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    _logger.LogWarning($"User not found for profile update: {userId}");
                    return AuthResultDto.Fail("Користувача не знайдено");
                }

                // Оновлюємо основні дані профілю
                if (!string.IsNullOrWhiteSpace(model.PhoneNumber))
                    user.PhoneNumber = model.PhoneNumber;

                if (!string.IsNullOrWhiteSpace(model.City))
                    user.Location = model.City;

                if (!string.IsNullOrWhiteSpace(model.AvatarUrl))
                    user.AvatarUrl = model.AvatarUrl;

                // Оновлюємо налаштування приватності
                if (model.IsPhoneNumberPrivate.HasValue)
                    user.IsPhoneNumberPrivate = model.IsPhoneNumberPrivate.Value;

                if (model.IsLocationPrivate.HasValue)
                    user.IsLocationPrivate = model.IsLocationPrivate.Value;

                user.PrivacySettingsUpdatedAt = DateTime.UtcNow;

                var result = await _userManager.UpdateAsync(user);
                if (!result.Succeeded)
                {
                    _logger.LogError($"Failed to update profile for user {userId}: {string.Join(", ", result.Errors.Select(e => e.Description))}");
                    return AuthResultDto.Fail("Помилка при оновленні профілю");
                }

                _logger.LogInformation($"Profile updated for user: {user.Email}");
                return AuthResultDto.Success("Профіль успішно оновлено");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error updating profile for user {userId}: {ex.Message}");
                return AuthResultDto.Fail("Помилка при оновленні профілю");
            }
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
