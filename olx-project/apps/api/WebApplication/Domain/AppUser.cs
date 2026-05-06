
using Microsoft.AspNetCore.Identity;

namespace Domain;

public class AppUser : IdentityUser<long>
{
    public string? RefreshToken { get; set; }
    public DateTime RefreshTokenExpiryTime { get; set; }

    public bool IsBanned { get; set; } = false;
    public string? BanReason { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Location { get; set; }

    // Дата реєстрації (корисно для адмінів)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public virtual ICollection<AppUserRole>? UserRoles { get; set; }
}
