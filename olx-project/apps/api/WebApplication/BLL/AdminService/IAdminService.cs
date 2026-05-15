using BLL.DTO.User;
using OLXCLONE.DTO.User;
namespace BLL.AdminService
{
    public interface IAdminService
    {
        Task<bool> BanUserAsync(long userId, string reason);
        Task<bool> UnbanUserAsync(long userId);
        Task<IEnumerable<UserDto>> GetAllUsersAsync();
        Task<UserDto> GetUserByIdAsync(long userId);
        Task<bool> DeleteUserAsync(long userId);
        Task<bool> AddAdminRoleAsync(string userId);
        Task<bool> AddAdminRoleAsync(long id);
    }
}