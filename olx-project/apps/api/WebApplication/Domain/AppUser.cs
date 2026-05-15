
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

    // Privacy Settings
    public bool IsPhoneNumberPrivate { get; set; } = true;
    public bool IsLocationPrivate { get; set; } = false;
    public DateTime PrivacySettingsUpdatedAt { get; set; } = DateTime.UtcNow;

    // Relationships for Reporting
    public virtual ICollection<Report>? ReportsCreated { get; set; } // Скарги, які цей юзер подав
    public virtual ICollection<Report>? ReportsReceived { get; set; } // Скарги на цього юзера
    public virtual ICollection<Report>? ReportsResolved { get; set; } // Скарги, які цей адмін розглянув
}
