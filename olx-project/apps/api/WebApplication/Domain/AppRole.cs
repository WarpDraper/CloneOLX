
using Microsoft.AspNetCore.Identity;

namespace Domain;

public class AppRole : IdentityRole<long>
{

    public AppRole() : base() { }

    public AppRole(string roleName) : base(roleName) { }

    public virtual ICollection<AppUserRole>? UserRoles { get; set; }
}
