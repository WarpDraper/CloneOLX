using AutoMapper;
using BLL.DTO.Authorize;
using BLL.DTO.User;
using DAL.UnitOfWork;
using Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;

namespace BLL.PrivacyService;

public interface IPrivacyService
{
    Task<AuthResultDto> UpdatePrivacySettingsAsync(long userId, PrivacySettingsDto settings);
    Task<PrivacySettingsDto> GetPrivacySettingsAsync(long userId);
    Task<UserPublicProfileDto> GetPublicProfileAsync(long userId);
    Task<bool> IsPhoneNumberVisibleAsync(long userId, long viewerId);
    Task<bool> IsLocationVisibleAsync(long userId, long viewerId);
}

public class PrivacyService : IPrivacyService
{
    private readonly UserManager<AppUser> _userManager;
    private readonly IMapper _mapper;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<PrivacyService> _logger;

    public PrivacyService(
        UserManager<AppUser> userManager, 
        IMapper mapper, 
        IUnitOfWork unitOfWork,
        ILogger<PrivacyService> logger)
    {
        _userManager = userManager;
        _mapper = mapper;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<AuthResultDto> UpdatePrivacySettingsAsync(long userId, PrivacySettingsDto settings)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                _logger.LogWarning($"User not found for privacy update: {userId}");
                return AuthResultDto.Fail("Користувача не знайдено");
            }

            user.IsPhoneNumberPrivate = settings.IsPhoneNumberPrivate;
            user.IsLocationPrivate = settings.IsLocationPrivate;
            user.PrivacySettingsUpdatedAt = DateTime.UtcNow;

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                _logger.LogError($"Failed to update privacy settings for user {userId}: {string.Join(", ", result.Errors.Select(e => e.Description))}");
                return AuthResultDto.Fail("Помилка оновлення налаштувань");
            }

            _logger.LogInformation($"Privacy settings updated for user: {user.Email}");
            return AuthResultDto.Success("Налаштування приватності оновлено");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error updating privacy settings for user {userId}: {ex.Message}");
            return AuthResultDto.Fail("Помилка при оновленні налаштувань приватності");
        }
    }

    public async Task<PrivacySettingsDto> GetPrivacySettingsAsync(long userId)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                _logger.LogWarning($"User not found for privacy settings retrieval: {userId}");
                return null!;
            }

            return new PrivacySettingsDto
            {
                IsPhoneNumberPrivate = user.IsPhoneNumberPrivate,
                IsLocationPrivate = user.IsLocationPrivate
            };
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error retrieving privacy settings for user {userId}: {ex.Message}");
            throw;
        }
    }

    public async Task<UserPublicProfileDto> GetPublicProfileAsync(long userId)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                _logger.LogWarning($"User not found for public profile: {userId}");
                return null!;
            }

            return new UserPublicProfileDto
            {
                Id = user.Id,
                UserName = user.UserName,
                AvatarUrl = user.AvatarUrl,
                PhoneNumber = user.IsPhoneNumberPrivate ? null : user.PhoneNumber,
                Location = user.IsLocationPrivate ? null : user.Location,
                CreatedAt = user.CreatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error retrieving public profile for user {userId}: {ex.Message}");
            throw;
        }
    }

    public async Task<bool> IsPhoneNumberVisibleAsync(long userId, long viewerId)
    {
        try
        {
            // Власник профілю завжди бачить свої дані
            if (userId == viewerId) return true;

            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                _logger.LogWarning($"User not found for visibility check: {userId}");
                return false;
            }

            // Якщо приватне, то видно тільки власнику
            if (user.IsPhoneNumberPrivate) return false;

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error checking phone number visibility for user {userId}: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> IsLocationVisibleAsync(long userId, long viewerId)
    {
        try
        {
            // Власник профілю завжди бачить свої дані
            if (userId == viewerId) return true;

            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                _logger.LogWarning($"User not found for visibility check: {userId}");
                return false;
            }

            // Якщо приватне, то видно тільки власнику
            if (user.IsLocationPrivate) return false;

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error checking location visibility for user {userId}: {ex.Message}");
            return false;
        }
    }
}
