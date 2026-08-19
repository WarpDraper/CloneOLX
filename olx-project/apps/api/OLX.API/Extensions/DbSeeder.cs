using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Http;
using Newtonsoft.Json;
using Olx.BLL.Entities;
using Olx.BLL.Entities.FilterEntities;
using Olx.BLL.Entities.NewPost;
using Olx.BLL.Helpers;
using Olx.BLL.Interfaces;
using Olx.BLL.Specifications;
using OLX.API.Models.Seeder;
using System.Text;


namespace OLX.API.Extensions
{
    public static class DBSeeder
    {
        public static async Task SeedDataAsync(this WebApplication app)
        {
            // Top-level guard: any unhandled failure below (roles, NewPost, users, filters,
            // categories, adverts) is caught and logged here instead of propagating up to
            // Program.cs and crashing the whole ASP.NET Core host on startup.
            try
            {
                await SeedDataInternalAsync(app);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DbSeeder] Seeding failed: {ex.Message}\n{ex}");
            }
        }

        private static async Task SeedDataInternalAsync(WebApplication app)
        {


            //Roles seeder
            using var scope = app.Services.CreateScope();
            var serviceProvider = scope.ServiceProvider;
            try
            {
                var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole<int>>>();
                var roles = Roles.Get();
                if (roleManager.Roles.Count() < roles.Count())
                {
                    foreach (var role in roles) {
                        if (! await roleManager.RoleExistsAsync(role))
                           await roleManager.CreateAsync(new IdentityRole<int>{ Name = role });
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DbSeeder] Roles seed failed: {ex.Message}\n{ex}");
            }

            //Admin account seeder — runs on every startup, unlike the "Users seeder" block
            // below (which only ever fires against a completely empty Users table). Guarantees
            // a working Admin login exists even if the table already has rows, and self-heals a
            // corrupt/manually-edited PasswordHash instead of leaving the account permanently
            // unable to log in (see SeedAdminAccountAsync for the two failure modes it covers).
            try
            {
                var adminUserManager = serviceProvider.GetRequiredService<UserManager<OlxUser>>();
                await SeedAdminAccountAsync(app, adminUserManager);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DbSeeder] Admin account seed failed: {ex.Message}\n{ex}");
            }


            //NewPost seeder
            try
            {
                var newPostService = scope.ServiceProvider.GetRequiredService<INewPostService>();
                var areaRepo = scope.ServiceProvider.GetRequiredService<IRepository<Area>>();
                if (!await areaRepo.AnyAsync())
                {
                    await newPostService.UpdateNewPostData();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DbSeeder] NewPost seed failed: {ex.Message}\n{ex}");
            }

            //Users seeder
            var userManager = serviceProvider.GetRequiredService<UserManager<OlxUser>>();
            var imageService = serviceProvider.GetRequiredService<IImageService>();
            if (!userManager.Users.Any())
            {
                Console.WriteLine("Start users seeder");
                string usersJsonDataFile = Path.Combine(Environment.CurrentDirectory, app.Configuration["SeederJsonDir"]!,"Users.json" );
                if (File.Exists(usersJsonDataFile))
                {
                    var userJson = File.ReadAllText(usersJsonDataFile, Encoding.UTF8);
                    try
                    {
                        var usersData = JsonConvert.DeserializeObject<IEnumerable<SeederUserModel>>(userJson)
                            ?? throw new JsonException();
                        // Dedup guard: collapse accidental duplicate fixture rows by email before
                        // insert, and skip any email that (for whatever reason, e.g. a previous
                        // partial seed run) already exists in the DB — Identity's CreateAsync would
                        // otherwise fail loudly per-duplicate instead of just skipping it.
                        var distinctUsers = usersData
                            .GroupBy(u => u.Email, StringComparer.OrdinalIgnoreCase)
                            .Select(g => g.First());
                        foreach (var user in distinctUsers)
                        {
                            if (await userManager.FindByEmailAsync(user.Email) is not null)
                            {
                                Console.WriteLine($"Skip duplicate user \"{user.Email}\"");
                                continue;
                            }
                            // Image seeding disabled: no physical files are downloaded, generated, or
                            // written to wwwroot/images at seed time (imageService.SaveImageAsync is
                            // never called here). PhotoBase64 fixture data is dropped entirely — there's
                            // no file to reference without writing one. A local PhotoUrl fixture path is
                            // kept as-is as a plain string reference on the record; a PhotoUrl pointing
                            // at a remote http(s) URL is treated as "no photo".
                            string? seededPhoto = null;
                            if (user.PhotoUrl is not null
                                && !user.PhotoUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
                                && !user.PhotoUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                            {
                                seededPhoto = user.PhotoUrl;
                            }

                            var newUser = new OlxUser
                            {
                                UserName = user.Email,
                                Email = user.Email,
                                PhoneNumber = user.PhoneNumber,
                                FirstName = user.FirstName,
                                LastName = user.LastName,
                                Photo = seededPhoto,
                                WebSite = user.WebSite,
                                About = user.About,
                                SettlementRef = user.SettlementRef,
                                EmailConfirmed = true,
                                // Distinct per-seed-user values (Users.json) instead of every
                                // seeded user rendering the same uniform entity default on seller
                                // cards. Falls back to the OlxUser defaults (5.0 / 0) when a
                                // fixture doesn't specify them.
                                Rating = user.Rating ?? 5.0,
                                ReviewsCount = user.ReviewsCount ?? 0
                            };

                            var result = await userManager.CreateAsync(newUser, user.Password);
                            if (result.Succeeded)
                                await userManager.AddToRoleAsync(newUser, user.Role);
                            else
                                Console.WriteLine($"Error create user \"{user.Email}\"");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[DbSeeder] Users seed failed: {ex.Message}\n{ex}");
                    }
                }
                else Console.WriteLine("File \"JsonData/Users.json\" not found");  
            }
            //Filter seeder
            var filterRepo = scope.ServiceProvider.GetService<IRepository<Filter>>();
            if (filterRepo is not null && !await filterRepo.AnyAsync() )
            {
                Console.WriteLine("Start filters seeder");
                string filtersJsonDataFile = Path.Combine(Environment.CurrentDirectory, app.Configuration["SeederJsonDir"]!, "Filters.json");
                if (File.Exists(filtersJsonDataFile))
                {
                    var filtersJson = File.ReadAllText(filtersJsonDataFile, Encoding.UTF8);
                    try
                    {
                        var filtersModels = JsonConvert.DeserializeObject<IEnumerable<SeederFilterModel>>(filtersJson)
                            ?? throw new JsonException();
                        if (filtersModels.Any())
                        {
                            var filters = filtersModels.Select(x => new Filter() 
                            { 
                                Name = x.Name,
                                Values = x.Values.Select(z => new FilterValue() { Value = z}).ToList()
                            });
                            await filterRepo.AddRangeAsync(filters);
                            await filterRepo.SaveAsync();
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[DbSeeder] Filters seed failed: {ex.Message}\n{ex}");
                    }
                }
                else Console.WriteLine("File \"JsonData/Filter.json\" not found");
            }
            //Category seeder
            var categoryRepo = scope.ServiceProvider.GetService<IRepository<Category>>();
            if (categoryRepo is not null && !await categoryRepo.AnyAsync())
            {
                Console.WriteLine("Start categories seeder");
                string categoryJsonDataFile = Path.Combine(Environment.CurrentDirectory, app.Configuration["SeederJsonDir"]!,"Categories.json");
                if (File.Exists(categoryJsonDataFile))
                {
                    var filtersJson = File.ReadAllText(categoryJsonDataFile, Encoding.UTF8);
                    try
                    {
                        var categoryModels = JsonConvert.DeserializeObject<IEnumerable<SeederCategoryModel>>(filtersJson)
                            ?? throw new JsonException();
                        if (categoryModels.Any() && filterRepo is not null)
                        {
                            var filters = await filterRepo.GetListBySpec(new FilterSpecs.GetAll());
                            var categorySeederJsonDir = Path.Combine(Environment.CurrentDirectory, app.Configuration["SeederJsonDir"]!);
                            await categoryRepo.AddRangeAsync(await GetCategories(categoryModels, filters, imageService, categorySeederJsonDir));
                            await categoryRepo.SaveAsync();
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[DbSeeder] Categories seed failed: {ex.Message}\n{ex}");
                    }
                }
                else Console.WriteLine("File \"JsonData/Categories.json\" not found");
            }

            // One-time cleanup for category icons saved by an older build of ImageService that
            // used ResizeMode.Pad + a white background: that baked visible letterbox bars into
            // the saved file itself, which no amount of frontend CSS cropping (object-cover, etc.)
            // can remove. Runs on every startup regardless of the AnyAsync() guard above — it needs
            // to cover categories created later through the admin UI too, not just the JSON seed —
            // but it's cheap and idempotent: an icon with no uniform border to trim (already clean,
            // or already fixed on a previous run) is returned byte-for-byte unchanged.
            try
            {
                await ReprocessLetterboxedCategoryImagesAsync(categoryRepo, imageService);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DbSeeder] Category image cleanup failed: {ex.Message}\n{ex}");
            }

            // One-time, opt-in backfill for subcategories with no Image set — downloads a
            // representative photo per subcategory from a free/keyless image API. Off by default
            // (see appsettings' Seeder:RunOneTimeSubcategorySeeder) so a normal app boot never
            // fires a burst of outbound requests against a third-party service; an admin flips
            // this to true for one run, then back to false.
            if (app.Configuration.GetValue<bool>("Seeder:RunOneTimeSubcategorySeeder", false))
            {
                try
                {
                    var httpClientFactory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();
                    await SeedMissingSubcategoryImagesAsync(categoryRepo, imageService, httpClientFactory);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[DbSeeder] SeedMissingSubcategoryImagesAsync failed: {ex.Message}\n{ex}");
                }
            }


            //Advert seeder
            // Adverts are seeded exclusively from Helpers/JsonData/Adverts.json (deserialized into
            // SeederAdvertModel) — no advert data is hardcoded in this file. Each definition's User
            // and Category (via CategoryPath) are validated against the DB before use, and its 3
            // ImagePaths are copied from Helpers/JsonData/SeedImages onto disk into
            // wwwroot/images/products/ (served via UseStaticFiles) and mapped onto AdvertImage
            // entities before SaveChanges is called.
            // NOTE: this directory is intentionally NOT named "adverts" — some ad-blocker
            // extensions block any request URL containing the "/adverts/" substring
            // (ERR_BLOCKED_BY_CLIENT), which would silently break every seeded product image.
            //
            // One-time pipeline: this is a straight "seed once, never touch again" fixture load —
            // if the table already has rows (from this seeder or otherwise), Adverts.json is never
            // even opened, let alone parsed. There is no reseed-on-mismatch / force-reseed path;
            // wiping and reloading a live table of user-generated adverts is not something a normal
            // app boot should ever do automatically.
            var settlementRepo = scope.ServiceProvider.GetService<IRepository<Settlement>>();
            var advertRepo = scope.ServiceProvider.GetService<IRepository<Advert>>();
            var filterValueRepo = scope.ServiceProvider.GetService<IRepository<FilterValue>>();
            var seederJsonDir = Path.Combine(Environment.CurrentDirectory, app.Configuration["SeederJsonDir"]!);

            var advertsAlreadySeeded = advertRepo is not null && await advertRepo.AnyAsync();
            if (advertRepo is not null && settlementRepo is not null && !advertsAlreadySeeded)
            {
                var advertDefinitions = new List<SeederAdvertModel>();
                string advertsJsonDataFile = Path.Combine(seederJsonDir, "Adverts.json");
                if (File.Exists(advertsJsonDataFile))
                {
                    var advertsJson = File.ReadAllText(advertsJsonDataFile, Encoding.UTF8);
                    try
                    {
                        advertDefinitions = JsonConvert.DeserializeObject<List<SeederAdvertModel>>(advertsJson)
                            ?? throw new JsonException();
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[DbSeeder] Failed to parse Adverts.json: {ex.Message}\n{ex}");
                    }
                }
                else Console.WriteLine("File \"JsonData/Adverts.json\" not found");

                Console.WriteLine($"Start adverts seeder (target: {advertDefinitions.Count})");

                try
                {
                    var allCategories = categoryRepo is not null
                        ? (await categoryRepo.GetListBySpec(new CategorySpecs.GetAll())).ToList()
                        : new List<Category>();
                    var categoriesById = allCategories.ToDictionary(c => c.Id);
                    // Condition ("Б/в"/"Нове") makes no sense for these top-level categories —
                    // an animal or a job/service listing isn't "new" or "used". Checked against
                    // the top-level ancestor of each advert's resolved category (below), so a
                    // random New/Used is skipped for e.g. any subcategory under "Тварини" too.
                    // Real top-level category names from Categories.json — "Послуги" isn't a
                    // top-level category on its own, it's folded into "Бізнес та послуги".
                    var conditionExcludedTopLevelCategories = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                    {
                        "Тварини", "Робота", "Бізнес та послуги"
                    };
                    var seedImagesDir = Path.Combine(seederJsonDir, "SeedImages");
                    var advertImagesDestDir = Path.Combine(Environment.CurrentDirectory, app.Configuration["ImagesDir"]!, "products");
                    Directory.CreateDirectory(advertImagesDestDir);

                    var adverts = new List<Advert>();
                    foreach (var def in advertDefinitions)
                    {
                        // Validate the user relation from the JSON before doing anything else with
                        // this advert — every seeded advert must belong to a real seeded user.
                        var user = await userManager.FindByIdAsync(def.UserId.ToString());
                        if (user is null)
                        {
                            Console.WriteLine($"[DbSeeder] Skipping advert \"{def.Title}\": user id {def.UserId} not found.");
                            continue;
                        }

                        // Validate the category relation: prefer the human-readable CategoryPath
                        // (resolved against the real DB-assigned ids), falling back to the raw
                        // CategoryId only if it already matches a seeded category.
                        int? categoryId = def.CategoryPath is { Count: > 0 } categoryPath
                            ? ResolveCategoryId(allCategories, categoryPath)
                            : null;
                        if (categoryId is null && def.CategoryId > 0 && allCategories.Any(c => c.Id == def.CategoryId))
                        {
                            categoryId = def.CategoryId;
                        }
                        if (categoryId is null)
                        {
                            Console.WriteLine($"[DbSeeder] Skipping advert \"{def.Title}\": category path not found ({string.Join(" > ", def.CategoryPath ?? Array.Empty<string>())}).");
                            continue;
                        }

                        if (string.IsNullOrWhiteSpace(def.SettlementRef))
                        {
                            Console.WriteLine($"[DbSeeder] Skipping advert \"{def.Title}\": no settlement reference specified.");
                            continue;
                        }
                        var settlement = await settlementRepo.GetByIDAsync(def.SettlementRef);
                        if (settlement is null)
                        {
                            Console.WriteLine($"[DbSeeder] Skipping advert \"{def.Title}\": settlement \"{def.SettlementRef}\" not found.");
                            continue;
                        }

                        if (def.ImagePaths.Count != 3)
                        {
                            Console.WriteLine($"[DbSeeder] Skipping advert \"{def.Title}\": expected exactly 3 image files in Adverts.json, found {def.ImagePaths.Count}.");
                            continue;
                        }

                        // Copy the 3 physical seed photos referenced by this advert onto disk so
                        // they exist under wwwroot/images/products/ and are reachable through
                        // /images/products/{file}, then map them onto AdvertImage entities.
                        // Routed through IImageService.ProcessImageAsync (not a raw File.Copy) so
                        // seeded product photos get the exact same 1200x1200 pad + high-quality
                        // re-encode + transparency handling as everything uploaded through the
                        // API, instead of shipping whatever raw fixture bytes happen to be on disk.
                        var images = new List<AdvertImage>();
                        var missingImage = false;
                        var priority = 0;
                        foreach (var imageFileName in def.ImagePaths)
                        {
                            var sourceFile = Path.Combine(seedImagesDir, imageFileName);
                            if (!File.Exists(sourceFile))
                            {
                                Console.WriteLine($"[DbSeeder] Skipping advert \"{def.Title}\": seed image \"{imageFileName}\" not found in SeedImages.");
                                missingImage = true;
                                break;
                            }
                            var (processedBytes, extension) = await imageService.ProcessImageAsync(await File.ReadAllBytesAsync(sourceFile));
                            var destFileName = $"{Path.GetFileNameWithoutExtension(imageFileName)}-{def.UserId}-{priority + 1}-{Guid.NewGuid():N}{extension}";
                            await File.WriteAllBytesAsync(Path.Combine(advertImagesDestDir, destFileName), processedBytes);
                            images.Add(new AdvertImage { Priority = priority, Name = $"products/{destFileName}" });
                            priority++;
                        }
                        if (missingImage)
                        {
                            continue;
                        }

                        var filterValues = def.FilterValueIds.Count > 0 && filterValueRepo is not null
                            ? (await filterValueRepo.GetListBySpec(new FilterValueSpecs.GetByIds(def.FilterValueIds))).ToList()
                            : new List<FilterValue>();

                        adverts.Add(new Advert()
                        {
                            UserId = user.Id,
                            PhoneNumber = string.IsNullOrWhiteSpace(def.PhoneNumber)
                                ? (string.IsNullOrWhiteSpace(user.PhoneNumber) ? "+380000000000" : user.PhoneNumber)
                                : def.PhoneNumber,
                            ContactEmail = string.IsNullOrWhiteSpace(def.ContactEmail) ? (user.Email ?? string.Empty) : def.ContactEmail,
                            ContactPersone = string.IsNullOrWhiteSpace(def.ContactPersone) ? $"{user.FirstName} {user.LastName}".Trim() : def.ContactPersone,
                            Title = def.Title,
                            Description = def.Description,
                            IsContractPrice = def.IsContractPrice,
                            Price = def.Price,
                            CategoryId = categoryId.Value,
                            Condition = GetSeededCondition(categoryId.Value, categoriesById, conditionExcludedTopLevelCategories),
                            FilterValues = filterValues,
                            Images = images,
                            Approved = true,
                            Completed = false,
                            Settlement = settlement
                        });
                    }

                    Console.WriteLine($"Adding {adverts.Count} adverts to the database.");
                    await advertRepo.AddRangeAsync(adverts);
                    await advertRepo.SaveAsync();
                    Console.WriteLine("Adverts added to the database.");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[DbSeeder] Adverts seed failed: {ex.Message}\n{ex}");
                }
            }
        }

        // Resolves a root-to-leaf category name path (e.g. ["Авто", "Легкові автомобілі"]) to the
        // real DB-assigned CategoryId, walking level by level so duplicate leaf names elsewhere in
        // the tree (e.g. "Продаж" appears under several parents) can't cause a wrong match.
        private static int? ResolveCategoryId(List<Category> categories, IReadOnlyList<string> path)
        {
            if (path.Count == 0) return null;

            // Dictionary<TKey,...> requires a non-null key (CS8714), but Category.ParentId is
            // `int?` (null for root categories) — group on a 0 sentinel instead (category ids
            // are DB auto-increment and start at 1, so 0 can never collide with a real id).
            const int RootSentinel = 0;
            var byParent = categories
                .GroupBy(c => c.ParentId ?? RootSentinel)
                .ToDictionary(g => g.Key, g => g.ToList());

            List<Category>? level = byParent.TryGetValue(RootSentinel, out var roots) ? roots : null;
            Category? match = null;

            foreach (var name in path)
            {
                match = level?.FirstOrDefault(c => string.Equals(c.Name, name, StringComparison.OrdinalIgnoreCase));
                if (match is null) return null;
                level = byParent.TryGetValue(match.Id, out var childs) ? childs : null;
            }

            return match?.Id;
        }

        // Random Used/New for a seeded advert's resolved category — None (no badge) for
        // categories where "condition" doesn't apply (see conditionExcludedTopLevelCategories at
        // the call site) or if the category's top-level ancestor can't be resolved for any reason.
        private static ItemCondition GetSeededCondition(
            int categoryId,
            Dictionary<int, Category> categoriesById,
            HashSet<string> excludedTopLevelCategoryNames)
        {
            var topLevelName = ResolveTopLevelCategoryName(categoryId, categoriesById);
            if (topLevelName is null || excludedTopLevelCategoryNames.Contains(topLevelName))
            {
                return ItemCondition.None;
            }
            return Random.Shared.Next(2) == 0 ? ItemCondition.Used : ItemCondition.New;
        }

        // Walks Category.ParentId up to the root to find the top-level category name a given
        // (possibly deeply nested) categoryId ultimately belongs to. Guards against a corrupt/
        // circular ParentId chain with a visited-count bound instead of looping forever.
        private static string? ResolveTopLevelCategoryName(int categoryId, Dictionary<int, Category> categoriesById)
        {
            if (!categoriesById.TryGetValue(categoryId, out var category)) return null;

            var guard = 0;
            while (category.ParentId is int parentId && categoriesById.TryGetValue(parentId, out var parent) && guard++ < categoriesById.Count)
            {
                category = parent;
            }
            return category.Name;
        }

        /// <summary>
        /// Guarantees a working Admin account exists and can actually log in, independent of the
        /// rest of the seeder — the "Users seeder" block above only ever runs once, against a
        /// completely empty Users table, so it can never repair or (re)create an admin once any
        /// row exists. This method recovers from two specific failure modes:
        ///   1. No account with the configured admin email exists at all (fresh DB where the
        ///      Users seeder never ran, or the row it created was later deleted) — a fresh admin
        ///      is created via UserManager.CreateAsync, which always produces a correctly
        ///      formatted Identity password hash (never a manual/raw DB insert).
        ///   2. An account exists but its PasswordHash column is corrupt / not valid Base64 —
        ///      e.g. it was written or edited directly against the database, bypassing Identity
        ///      entirely. UserManager.CheckPasswordAsync throws FormatException for that instead
        ///      of returning false (the exact issue AccountService.LoginAsync now also guards
        ///      against). Caught here and repaired by resetting the password through Identity's
        ///      own RemovePasswordAsync/AddPasswordAsync, which is guaranteed to leave a
        ///      well-formed hash behind.
        /// Credentials come from "AdminSeed:Email"/"AdminSeed:Password" in configuration, falling
        /// back to the same admin fixture already defined in Helpers/JsonData/Users.json so a
        /// freshly seeded DB and one repaired by this method converge on the same admin login.
        /// Never throws — every failure is logged and this returns, exactly like every other
        /// seeder section in this file, so a problem here can never crash startup.
        /// </summary>
        private static async Task SeedAdminAccountAsync(WebApplication app, UserManager<OlxUser> userManager)
        {
            var adminEmail = app.Configuration["AdminSeed:Email"] ?? "valentyna.marchenko18@gmail.com";
            var adminPassword = app.Configuration["AdminSeed:Password"] ?? "Passw0rd_23";

            var admin = await userManager.FindByEmailAsync(adminEmail);

            if (admin is null)
            {
                Console.WriteLine($"[DbSeeder] No admin account found for \"{adminEmail}\" — creating one.");
                admin = new OlxUser
                {
                    UserName = adminEmail,
                    Email = adminEmail,
                    EmailConfirmed = true,
                    FirstName = "Admin",
                    LastName = "Admin",
                };
                var createResult = await userManager.CreateAsync(admin, adminPassword);
                if (!createResult.Succeeded)
                {
                    Console.WriteLine($"[DbSeeder] Failed to create admin account \"{adminEmail}\": {string.Join("; ", createResult.Errors.Select(e => e.Description))}");
                    return;
                }
                Console.WriteLine($"[DbSeeder] Admin account \"{adminEmail}\" created.");
            }

            if (!await userManager.IsInRoleAsync(admin, Roles.Admin))
            {
                var roleResult = await userManager.AddToRoleAsync(admin, Roles.Admin);
                if (!roleResult.Succeeded)
                {
                    Console.WriteLine($"[DbSeeder] Failed to grant Admin role to \"{adminEmail}\": {string.Join("; ", roleResult.Errors.Select(e => e.Description))}");
                }
            }

            // Probe the stored hash through Identity's own verifier before trusting it. A
            // corrupt/non-Base64 PasswordHash throws FormatException here rather than returning
            // a mismatch — a mismatch (wrong-but-well-formed hash) is left alone, since that just
            // means the deployed admin password legitimately differs from the configured
            // default and overwriting it would be destructive, not a repair.
            var passwordHashIsUsable = true;
            try
            {
                await userManager.CheckPasswordAsync(admin, adminPassword);
            }
            catch (FormatException)
            {
                passwordHashIsUsable = false;
            }

            if (!passwordHashIsUsable)
            {
                Console.WriteLine($"[DbSeeder] Admin account \"{adminEmail}\" has a corrupt password hash — resetting it.");
                if (await userManager.HasPasswordAsync(admin))
                {
                    var removeResult = await userManager.RemovePasswordAsync(admin);
                    if (!removeResult.Succeeded)
                    {
                        Console.WriteLine($"[DbSeeder] Failed to remove corrupt admin password hash for \"{adminEmail}\": {string.Join("; ", removeResult.Errors.Select(e => e.Description))}");
                        return;
                    }
                }
                var addResult = await userManager.AddPasswordAsync(admin, adminPassword);
                if (!addResult.Succeeded)
                {
                    Console.WriteLine($"[DbSeeder] Failed to reset admin password hash for \"{adminEmail}\": {string.Join("; ", addResult.Errors.Select(e => e.Description))}");
                    return;
                }
                Console.WriteLine($"[DbSeeder] Admin account \"{adminEmail}\" password hash repaired.");
            }
        }

        /// <summary>
        /// Re-runs every persisted category icon through <see cref="IImageService.ReprocessStoredImageAsync(string)"/>,
        /// which trims any uniform (letterbox) border and re-encodes with the padding-free resize
        /// pipeline. Updates Category.Image if the file's extension changed (rare — only when
        /// trimming reveals/removes an alpha channel). See the call site above for why this runs
        /// unconditionally instead of being gated behind an "already seeded" check.
        /// </summary>
        private static async Task ReprocessLetterboxedCategoryImagesAsync(IRepository<Category>? categoryRepo, IImageService imageService)
        {
            if (categoryRepo is null) return;

            var categories = await categoryRepo.GetQuery(QueryTrackingBehavior.TrackAll)
                .Where(c => c.Image != null && c.Image != "")
                .ToListAsync();
            if (categories.Count == 0) return;

            var reprocessed = 0;
            foreach (var category in categories)
            {
                var newName = await imageService.ReprocessStoredImageAsync(category.Image!);
                if (newName is null)
                {
                    Console.WriteLine($"[DbSeeder] Category \"{category.Name}\" image \"{category.Image}\" not found on disk — skipping.");
                    continue;
                }
                if (newName != category.Image)
                {
                    category.Image = newName;
                }
                reprocessed++;
            }
            await categoryRepo.SaveAsync();
            Console.WriteLine($"[DbSeeder] Checked {reprocessed} category image(s) for baked-in letterbox padding.");
        }

        // Maps each top-level category name to an English loremflickr.com tag so backfilled
        // subcategory images are at least thematically relevant instead of generic. Falls back to
        // <see cref="DefaultCategoryImageTag"/> for any top-level category not listed here (keeps
        // this from throwing if Categories.json gains a new top-level category later).
        private static readonly Dictionary<string, string> TopLevelCategoryImageTags = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Дитячий світ"] = "kids",
            ["Нерухомість"] = "house",
            ["Авто"] = "car",
            ["Запрчастини для транспорту"] = "carparts",
            ["Робота"] = "office",
            ["Тварини"] = "animal",
            ["Дім і сад"] = "furniture",
            ["Електроніка"] = "electronics",
            ["Бізнес та послуги"] = "business",
            ["Оренда та прокат"] = "rental",
            ["Мода і стиль"] = "fashion",
            ["Хоббі,відпочинок та спорт"] = "sport",
        };
        private const string DefaultCategoryImageTag = "product";

        /// <summary>
        /// One-time, opt-in backfill for subcategories (Category.ParentId != null) that have no
        /// Image set. For each one, resolves its top-level category (see
        /// <see cref="ResolveTopLevelCategoryName"/>) to an English tag via
        /// <see cref="TopLevelCategoryImageTags"/> and requests a matching stock photo from
        /// loremflickr.com — a fast, keyless stock-photo CDN. This replaced pollinations.ai, whose
        /// on-demand AI image generation throttled bursts of sequential requests with 429 Too Many
        /// Requests almost immediately. The downloaded bytes are routed through the same
        /// <see cref="IImageService.SaveImageAsync(byte[])"/> pipeline every uploaded image goes
        /// through (resize/re-encode to the app's standard format), then Category.Image is updated
        /// to point at the saved file.
        ///
        /// Never runs automatically — gated behind Seeder:RunOneTimeSubcategorySeeder at the call
        /// site in <see cref="SeedDataInternalAsync"/>. A failure on one subcategory (429/500 from
        /// the CDN, network error, corrupt response) is logged and skipped so it can never abort
        /// the whole batch; already-seeded rows from an earlier partial run are naturally skipped
        /// too, since the Image == null/empty filter no longer matches them.
        /// </summary>
        private static async Task SeedMissingSubcategoryImagesAsync(
            IRepository<Category>? categoryRepo,
            IImageService imageService,
            IHttpClientFactory httpClientFactory)
        {
            if (categoryRepo is null) return;

            // CategoryOpt.Parent includes the Parent navigation property; categoriesById (built
            // from the same full list) additionally lets ResolveTopLevelCategoryName walk the
            // ParentId chain all the way to the root for accurate tag selection below.
            var allCategories = (await categoryRepo.GetListBySpec(new CategorySpecs.GetAll(CategoryOpt.Parent))).ToList();
            var categoriesById = allCategories.ToDictionary(c => c.Id);
            var missing = allCategories
                .Where(c => c.ParentId != null && string.IsNullOrEmpty(c.Image))
                .ToList();

            if (missing.Count == 0)
            {
                Console.WriteLine("[DbSeeder] SeedMissingSubcategoryImagesAsync: no subcategories are missing an image — nothing to do.");
                return;
            }

            Console.WriteLine($"[DbSeeder] SeedMissingSubcategoryImagesAsync: backfilling {missing.Count} subcategory image(s).");

            var httpClient = httpClientFactory.CreateClient(HttpClients.ImageDownload);
            var seeded = 0;
            var failed = 0;

            foreach (var category in missing)
            {
                var topLevelName = ResolveTopLevelCategoryName(category.Id, categoriesById);
                var tag = topLevelName is not null && TopLevelCategoryImageTags.TryGetValue(topLevelName, out var mappedTag)
                    ? mappedTag
                    : DefaultCategoryImageTag;

                try
                {
                    // 800x800 stock photo matched to `tag`. Unlike pollinations.ai's on-demand AI
                    // generation, loremflickr serves an existing photo with no per-request render
                    // work, so it tolerates back-to-back requests without throttling.
                    var imageUrl = $"https://loremflickr.com/800/800/{Uri.EscapeDataString(tag)}";
                    using var request = new HttpRequestMessage(HttpMethod.Get, imageUrl);
                    request.Headers.UserAgent.ParseAdd(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");

                    using var response = await httpClient.SendAsync(request);
                    byte[] imageBytes;
                    if (!response.IsSuccessStatusCode)
                    {
                        // Guaranteed-uptime fallback: picsum.photos never 429s and doesn't depend
                        // on a tag existing, so a bad/rate-limited loremflickr response still ends
                        // in a usable image instead of leaving the subcategory blank.
                        Console.WriteLine($"[DbSeeder] loremflickr returned {(int)response.StatusCode} for subcategory \"{category.Name}\" (tag \"{tag}\") — falling back to picsum.photos.");
                        var fallbackUrl = $"https://picsum.photos/seed/{category.Id}/800/800";
                        using var fallbackRequest = new HttpRequestMessage(HttpMethod.Get, fallbackUrl);
                        fallbackRequest.Headers.UserAgent.ParseAdd(
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                        using var fallbackResponse = await httpClient.SendAsync(fallbackRequest);
                        fallbackResponse.EnsureSuccessStatusCode();
                        imageBytes = await fallbackResponse.Content.ReadAsByteArrayAsync();
                    }
                    else
                    {
                        imageBytes = await response.Content.ReadAsByteArrayAsync();
                    }

                    category.Image = await imageService.SaveImageAsync(imageBytes);
                    seeded++;
                }
                catch (Exception ex)
                {
                    // Covers a 429/500 that also survives the fallback attempt above, plus any
                    // network-level failure (timeout, DNS, etc.) on either request — logged and
                    // skipped so one bad subcategory can never abort the whole batch.
                    failed++;
                    Console.WriteLine($"[DbSeeder] Failed to seed image for subcategory \"{category.Name}\" (tag \"{tag}\"): {ex.Message}");
                }

                // Polite pacing against a free, unauthenticated CDN — this only ever runs as a
                // manually-triggered one-off, never on a normal boot, so the extra runtime is a
                // good trade for not hammering a third-party service. Bumped from 500ms to 1500ms
                // since loremflickr rate-limits bursts more aggressively than the previous provider.
                await Task.Delay(1500);
            }

            await categoryRepo.SaveAsync();
            Console.WriteLine($"[DbSeeder] SeedMissingSubcategoryImagesAsync done: {seeded} seeded, {failed} failed.");
        }

        private async static Task<IEnumerable<Category>> GetCategories(
            IEnumerable<SeederCategoryModel> models,
            IEnumerable<Filter> filters,
            IImageService imageService,
            string seederJsonDir)
        {
            var categoryTasks =  models.Select(async (x) =>
            {
                var advertFilters = x.Filters?.Any() ?? false ? filters.Where(z => x.Filters.Contains(z.Name)) : null;
                var childs = x.Childs?.Any() ?? false ? await GetCategories(x.Childs, filters, imageService, seederJsonDir) : null;
                // Image seeding disabled: category images are never downloaded, generated, or
                // written to wwwroot/images (imageService.SaveImageAsync is never called here).
                // A local fixture path is kept as-is as a plain string reference; a fixture entry
                // that specifies a remote http(s) URL is skipped (logged) instead of downloaded.
                string? image = null;
                if (!String.IsNullOrEmpty(x.Image))
                {
                    var isRemoteUrl = x.Image.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
                        || x.Image.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
                    if (isRemoteUrl)
                    {
                        Console.WriteLine($"[DbSeeder] Skipping remote category image URL (network fetch disabled): {x.Image}");
                    }
                    else
                    {
                        image = x.Image;
                    }
                }
                return new Category()
                {
                    Name = x.Name,
                    Image = image,
                    Filters = advertFilters?.ToArray() ?? [],
                    Childs = childs?.ToArray() ?? []
                };
            });
            var categories = await Task.WhenAll(categoryTasks);
            return categories;
        }
    }
}
