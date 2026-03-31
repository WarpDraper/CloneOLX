using AuthDomain;
using Microsoft.AspNetCore.Identity;

namespace OnlineLibrary_BookKey.Configuration.Role
{
    public static class DbInitializer
    {
        public static async Task SeedAsync(UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager)
        {
            // 1. Створюємо ролі, якщо їх ще немає
            await roleManager.CreateAsync(new IdentityRole("Admin"));
            await roleManager.CreateAsync(new IdentityRole("User"));

            // 2. Створюємо головного Адміна (якщо його немає)
            var adminEmail = "admin@gmail.com";
            var adminUser = await userManager.FindByEmailAsync(adminEmail);

            if (adminUser == null)
            {
                var newAdmin = new ApplicationUser
                {
                    UserName = "admin",
                    Email = adminEmail,
                    EmailConfirmed = true
                };

                // Пароль має бути складним (Identity вимагає цифри, великі літери і спецсимволи)
                var result = await userManager.CreateAsync(newAdmin, "AdminPassword123!");

                if (result.Succeeded)
                {
                    // Видаємо йому роль "Admin"
                    await userManager.AddToRoleAsync(newAdmin, "Admin");
                }
            }
        }
    }
}
