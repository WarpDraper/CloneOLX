
using Microsoft.AspNetCore.Identity;

namespace AuthDomain
{
    public class ApplicationRole : IdentityRole<long>
    {
        public ApplicationRole() : base() { }

        public ApplicationRole(string roleName) : base(roleName) { }
    }
}
