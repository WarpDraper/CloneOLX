using System.Reflection;

namespace Olx.BLL.Helpers
{
    public static class Roles
    {
        public const string Admin = "Admin";
        public const string User = "User";

        // [Authorize(Roles = "...")] treats a comma-separated list as OR ("has ANY of these
        // roles"), not AND — used for endpoints both regular users and admins must be able to
        // hit (e.g. chat), as opposed to bare [Authorize] (any authenticated principal at all)
        // or a single-role check (which excludes the other role entirely). Must stay a `const`
        // (not a property/method) since [Authorize] attribute arguments have to be compile-time
        // constants — Get() below filters it back out by the comma so Identity role seeding
        // never tries to create a literal "User,Admin" role.
        public const string UserOrAdmin = User + "," + Admin;

        public static IEnumerable<string> Get() => typeof(Roles).GetFields(BindingFlags.Public | BindingFlags.Static |
               BindingFlags.FlattenHierarchy).Select(x => (string)x.GetValue(null)!).Where(x => !x.Contains(','));
    }
}
