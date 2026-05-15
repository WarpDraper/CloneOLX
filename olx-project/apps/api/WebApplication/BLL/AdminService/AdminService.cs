using AutoMapper;
using Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using OLXCLONE.DTO.User;

namespace BLL.AdminService
{
    public class AdminService : IAdminService
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly IMapper _mapper;
        private readonly ILogger<AdminService> _logger;

        public AdminService(UserManager<AppUser> userManager, IMapper mapper, ILogger<AdminService> logger)
        {
            _userManager = userManager;
            _mapper = mapper;
            _logger = logger;
        }

        public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
        {
            try
            {
                var users = await _userManager.Users.ToListAsync();
                _logger.LogInformation($"Retrieved {users.Count} users");
                return _mapper.Map<IEnumerable<UserDto>>(users);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error retrieving all users: {ex.Message}");
                throw;
            }
        }

        public async Task<UserDto> GetUserByIdAsync(long userId)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(userId.ToString());
                if (user == null)
                {
                    _logger.LogWarning($"User not found: {userId}");
                    return null!;
                }

                _logger.LogInformation($"Retrieved user: {user.Email}");
                return _mapper.Map<UserDto>(user);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error retrieving user {userId}: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> BanUserAsync(long userId, string reason)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(userId.ToString());
                if (user == null)
                {
                    _logger.LogWarning($"Cannot ban user - user not found: {userId}");
                    return false;
                }

                user.IsBanned = true;
                user.BanReason = reason;
                user.RefreshToken = null;
                user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(-1);
                
                var result = await _userManager.UpdateAsync(user);
                if (result.Succeeded)
                {
                    _logger.LogWarning($"User banned: {user.Email}. Reason: {reason}");
                }
                else
                {
                    _logger.LogError($"Failed to ban user {userId}: {string.Join(", ", result.Errors.Select(e => e.Description))}");
                }
                return result.Succeeded;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error banning user {userId}: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> UnbanUserAsync(long userId)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(userId.ToString());
                if (user == null)
                {
                    _logger.LogWarning($"Cannot unban user - user not found: {userId}");
                    return false;
                }

                user.IsBanned = false;
                user.BanReason = null;

                var result = await _userManager.UpdateAsync(user);
                if (result.Succeeded)
                {
                    _logger.LogInformation($"User unbanned: {user.Email}");
                }
                else
                {
                    _logger.LogError($"Failed to unban user {userId}: {string.Join(", ", result.Errors.Select(e => e.Description))}");
                }
                return result.Succeeded;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error unbanning user {userId}: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> DeleteUserAsync(long userId)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(userId.ToString());
                if (user == null)
                {
                    _logger.LogWarning($"Cannot delete user - user not found: {userId}");
                    return false;
                }

                var result = await _userManager.DeleteAsync(user);
                if (result.Succeeded)
                {
                    _logger.LogWarning($"User deleted: {user.Email}");
                }
                else
                {
                    _logger.LogError($"Failed to delete user {userId}: {string.Join(", ", result.Errors.Select(e => e.Description))}");
                }
                return result.Succeeded;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error deleting user {userId}: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> AddAdminRoleAsync(string userId)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    _logger.LogWarning($"Cannot add admin role - user not found: {userId}");
                    return false;
                }

                // Перевірка чи вже адмін
                var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");
                if (isAdmin)
                {
                    _logger.LogInformation($"User is already admin: {user.Email}");
                    return true;
                }

                var result = await _userManager.AddToRoleAsync(user, "Admin");
                if (result.Succeeded)
                {
                    _logger.LogWarning($"User promoted to admin: {user.Email}");
                }
                else
                {
                    _logger.LogError($"Failed to add admin role to user {userId}: {string.Join(", ", result.Errors.Select(e => e.Description))}");
                }
                return result.Succeeded;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error adding admin role to user {userId}: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> AddAdminRoleAsync(long userId)
        {
            try
            {
                return await AddAdminRoleAsync(userId.ToString());
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error adding admin role to user {userId}: {ex.Message}");
                throw;
            }
        }
    }
}
