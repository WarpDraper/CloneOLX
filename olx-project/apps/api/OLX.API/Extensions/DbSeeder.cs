using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
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


            //NewPost seeder
            try
            {
                using var newPostService = scope.ServiceProvider.GetRequiredService<INewPostService>();
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
