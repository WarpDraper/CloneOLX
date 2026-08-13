using Microsoft.AspNetCore.Identity;
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
<<<<<<< HEAD
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

=======
>>>>>>> origin/tobi-nazar
                            var newUser = new OlxUser
                            {
                                UserName = user.Email,
                                Email = user.Email,
                                PhoneNumber = user.PhoneNumber,
                                FirstName = user.FirstName,
                                LastName = user.LastName,
<<<<<<< HEAD
                                Photo = seededPhoto,
=======
                                Photo = user.PhotoBase64 is not null
                                ? await imageService.SaveImageAsync(user.PhotoBase64)
                                : await imageService.SaveImageFromUrlAsync(user.PhotoUrl ?? "https://picsum.photos/800/600"),
>>>>>>> origin/tobi-nazar
                                WebSite = user.WebSite,
                                About = user.About,
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
<<<<<<< HEAD
                            var seederJsonDir = Path.Combine(Environment.CurrentDirectory, app.Configuration["SeederJsonDir"]!);
                            await categoryRepo.AddRangeAsync(await GetCategories(categoryModels, filters, imageService, seederJsonDir));
=======
                            await categoryRepo.AddRangeAsync(await GetCategories(categoryModels, filters,imageService));
>>>>>>> origin/tobi-nazar
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
            // Fixture is an all-or-nothing 80-item demo snapshot (see Adverts.json) — reseed
            // whenever the DB doesn't already hold exactly that many (covers a fresh DB, a stale
            // DB left over from a previous larger fixture, and manual force-reseed), instead of a
            // "< minimum" threshold that would silently never shrink an over-sized table back down.
            const int TargetAdvertCount = 80;
            var filterValueRepo = scope.ServiceProvider.GetService<IRepository<FilterValue>>();
            var settlementRepo = scope.ServiceProvider.GetService<IRepository<Settlement>>();
            var advertRepo = scope.ServiceProvider.GetService<IRepository<Advert>>();
            var advertImageRepo = scope.ServiceProvider.GetService<IRepository<AdvertImage>>();
            var forceReseedAdverts = app.Configuration.GetValue<bool>("Seeder:ForceReseedAdverts");
            var currentAdvertCount = advertRepo is not null ? await advertRepo.CountAsync() : 0;
            if (advertRepo is not null && (currentAdvertCount != TargetAdvertCount || forceReseedAdverts))
            {
                Console.WriteLine($"Start adverts seeder (current count: {currentAdvertCount}, forceReseed: {forceReseedAdverts})");

                // Re-hydrate: the fixture file is an all-or-nothing snapshot of demo adverts, so a
                // partial/stale table (e.g. from an interrupted previous seed, a leftover larger
                // fixture, or a manual force-reseed trigger) is wiped and reloaded from scratch
                // rather than merged.
                if (currentAdvertCount > 0)
                {
                    var existingAdverts = (await advertRepo.GetListBySpec(new AdvertSpecs.GetAll(AdvertOpt.Images))).ToList();
                    if (advertImageRepo is not null)
                    {
                        var existingImages = existingAdverts.SelectMany(a => a.Images ?? Enumerable.Empty<AdvertImage>()).ToList();
                        if (existingImages.Count > 0)
                        {
                            advertImageRepo.DeleteRange(existingImages);
                            await advertImageRepo.SaveAsync();
                        }
                    }
                    advertRepo.DeleteRange(existingAdverts);
                    await advertRepo.SaveAsync();
                    Console.WriteLine($"Cleared {existingAdverts.Count} existing adverts before re-seeding.");
                }
                string advertsJsonDataFile = Path.Combine(Environment.CurrentDirectory, app.Configuration["SeederJsonDir"]!, "Adverts.json");
                if (File.Exists(advertsJsonDataFile))
                {
                    var advertsJson = File.ReadAllText(advertsJsonDataFile, Encoding.UTF8);
                    try
                    {
                        var parsedAdvertModels = JsonConvert.DeserializeObject<IEnumerable<SeederAdvertModel>>(advertsJson)
                            ?? throw new JsonException();
                        // Dedup guard: collapse accidental duplicate fixture rows (same title from
                        // the same seller) before insert, so a hand-edited/regenerated Adverts.json
                        // can never silently produce duplicate listings in the DB.
                        var advertModels = parsedAdvertModels
                            .GroupBy(x => (x.Title, x.UserId))
                            .Select(g => g.First())
                            .ToList();
                        if (advertModels.Count != parsedAdvertModels.Count())
                        {
                            Console.WriteLine($"Skipped {parsedAdvertModels.Count() - advertModels.Count} duplicate advert fixture rows.");
                        }
                        if (advertModels.Any() && filterValueRepo is not null)
                        {
                            // Categories are auto-increment ids assigned on insert, so a hand-copied
                            // numeric CategoryId in Adverts.json can silently point at the wrong (or a
                            // nonexistent) category and abort the whole seed batch via an FK violation.
                            // Entries that specify CategoryPath resolve against the just-seeded category
                            // tree instead — see ResolveCategoryId below.
                            var allCategories = categoryRepo is not null
                                ? (await categoryRepo.GetListBySpec(new CategorySpecs.GetAll())).ToList()
                                : new List<Category>();
                            // Narrowed to a non-null local before the closure below — the nullable
                            // flow analysis for `filterValueRepo is not null` above doesn't carry
                            // into a captured variable inside a lambda, which otherwise triggers
                            // CS8602 on the dereference a few lines down.
                            var filterValueRepoNonNull = filterValueRepo;

                            // Built sequentially (not via Task.WhenAll over the projection) because each
                            // iteration awaits calls against the shared DbContext (filterValueRepo,
                            // settlementRepo) — running those concurrently throws "A second operation
                            // was started on this context instance before a previous operation completed".
                            var adverts = new List<Advert>();
                            foreach (var x in advertModels)
                            {
                                var resolvedCategoryId = (x.CategoryPath is not null && x.CategoryPath.Count > 0)
                                    ? ResolveCategoryId(allCategories, x.CategoryPath) ?? x.CategoryId
                                    : x.CategoryId;
                                var filterValues = (await filterValueRepoNonNull.GetListBySpec(new FilterValueSpecs.GetByIds(x.FilterValueIds))).ToList();
<<<<<<< HEAD
                                // Image seeding disabled: advert images are never downloaded, generated,
                                // or written to wwwroot/images (imageService.SaveImageAsync is never
                                // called here). Local fixture paths are kept as plain string references
                                // on the AdvertImage records instead — no file read, no file write.
                                var images = x.ImagePaths
                                    .Where(path =>
                                    {
                                        var isRemoteUrl = path.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
                                            || path.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
                                        if (isRemoteUrl)
                                        {
                                            Console.WriteLine($"[DbSeeder] Skipping remote image URL (network fetch disabled): {path}");
                                        }
                                        return !isRemoteUrl;
                                    })
                                    .Select((path, index) => new AdvertImage()
                                    {
                                        Priority = index,
                                        Name = path
                                    })
                                    .ToArray();
=======
                                // Fixture images are either a real remote URL (downloaded over HTTP,
                                // as before) or a path relative to SeederJsonDir pointing at a fixture
                                // shipped in the repo (Helpers/JsonData/SeedImages/*.jpg) — read straight
                                // off disk instead. The local branch has zero network dependency, so
                                // seeding can never fail on an unreachable/rate-limited/erroring
                                // third-party image host (this replaced loremflickr.com, which was
                                // intermittently returning 500s).
                                // imagesTasks only touch the (DbContext-free) imageService, so it's safe
                                // to keep this inner batch parallel.
                                var imagesTasks = x.ImagePaths.Select(async (path, index) =>
                                {
                                    var isRemoteUrl = path.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
                                        || path.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
                                    var savedName = isRemoteUrl
                                        ? await imageService.SaveImageFromUrlAsync(path)
                                        : await imageService.SaveImageAsync(await File.ReadAllBytesAsync(
                                            Path.Combine(Environment.CurrentDirectory, app.Configuration["SeederJsonDir"]!, path)));
                                    return new AdvertImage()
                                    {
                                        Priority = index,
                                        Name = savedName
                                    };
                                });
                                var images = await Task.WhenAll(imagesTasks);
>>>>>>> origin/tobi-nazar
                                var settlement = await settlementRepo.GetByIDAsync(x.SettlementRef) ??
                                    throw new NullReferenceException("settlement not found");
                                adverts.Add(new Advert()
                                {
                                    UserId = x.UserId,
                                    PhoneNumber = x.PhoneNumber,
                                    ContactEmail = x.ContactEmail,
                                    ContactPersone = x.ContactPersone,
                                    Title = x.Title,
                                    Description = x.Description,
                                    IsContractPrice = x.IsContractPrice,
                                    Price = x.Price,
                                    CategoryId = resolvedCategoryId,
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
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[DbSeeder] Adverts seed failed: {ex.Message}\n{ex}");
                    }
                }
                else Console.WriteLine("File \"Adverts.json\" not found");
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
<<<<<<< HEAD
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
=======
            IImageService imageService)
        {
            var categoryTasks =  models.Select(async (x) => 
            {
                var advertFilters = x.Filters?.Any() ?? false ? filters.Where(z => x.Filters.Contains(z.Name)) : null;
                var childs = x.Childs?.Any() ?? false ? await GetCategories(x.Childs, filters, imageService) : null;
                var image = !String.IsNullOrEmpty(x.Image)
                    ? await imageService.SaveImageFromUrlAsync(x.Image)
                    : null;
>>>>>>> origin/tobi-nazar
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
