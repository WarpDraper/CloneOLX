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

           
            //Roles seeder
            using var scope = app.Services.CreateScope();
            var serviceProvider = scope.ServiceProvider;
            var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole<int>>>();
            var roles = Roles.Get();
            if (roleManager.Roles.Count() < roles.Count())
            {
                foreach (var role in roles) {
                    if (! await roleManager.RoleExistsAsync(role))
                       await roleManager.CreateAsync(new IdentityRole<int>{ Name = role });
                }
            }


            //NewPost seeder
            using (var newPostService = scope.ServiceProvider.GetRequiredService<INewPostService>())
            {
                var areaRepo = scope.ServiceProvider.GetRequiredService<IRepository<Area>>();
                if (!await areaRepo.AnyAsync())
                {
                    await newPostService.UpdateNewPostData();
                }
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
                        foreach (var user in usersData)
                        {
                            var newUser = new OlxUser
                            {
                                UserName = user.Email,
                                Email = user.Email,
                                PhoneNumber = user.PhoneNumber,
                                FirstName = user.FirstName,
                                LastName = user.LastName,
                                Photo = user.PhotoBase64 is not null
                                ? await imageService.SaveImageAsync(user.PhotoBase64)
                                : await imageService.SaveImageFromUrlAsync(user.PhotoUrl ?? "https://picsum.photos/800/600"),
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
                    catch (JsonException)
                    {
                        Console.WriteLine("Error deserialize users json file");
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
                    catch (JsonException)
                    {
                        Console.WriteLine("Error deserialize filters json file");
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
                            await categoryRepo.AddRangeAsync(await GetCategories(categoryModels, filters,imageService));
                            await categoryRepo.SaveAsync();
                        }
                    }
                    catch (JsonException)
                    {
                        Console.WriteLine("Error deserialize categories json file");
                    }
                }
                else Console.WriteLine("File \"JsonData/Categories.json\" not found");
            }


            //Advert seeder
            const int MinSeededAdvertCount = 500;
            var filterValueRepo = scope.ServiceProvider.GetService<IRepository<FilterValue>>();
            var settlementRepo = scope.ServiceProvider.GetService<IRepository<Settlement>>();
            var advertRepo = scope.ServiceProvider.GetService<IRepository<Advert>>();
            var advertImageRepo = scope.ServiceProvider.GetService<IRepository<AdvertImage>>();
            var forceReseedAdverts = app.Configuration.GetValue<bool>("Seeder:ForceReseedAdverts");
            var currentAdvertCount = advertRepo is not null ? await advertRepo.CountAsync() : 0;
            if (advertRepo is not null && (currentAdvertCount < MinSeededAdvertCount || forceReseedAdverts))
            {
                Console.WriteLine($"Start adverts seeder (current count: {currentAdvertCount}, forceReseed: {forceReseedAdverts})");

                // Re-hydrate: the fixture file is an all-or-nothing snapshot of 500 demo adverts, so a
                // partial/stale table (e.g. from an interrupted previous seed, or a manual force-reseed
                // trigger) is wiped and reloaded from scratch rather than merged.
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
                        var advertModels = JsonConvert.DeserializeObject<IEnumerable<SeederAdvertModel>>(advertsJson)
                            ?? throw new JsonException();
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

                            var advertsTasks = advertModels.Select(async (x) =>
                            {
                                var resolvedCategoryId = (x.CategoryPath is not null && x.CategoryPath.Count > 0)
                                    ? ResolveCategoryId(allCategories, x.CategoryPath) ?? x.CategoryId
                                    : x.CategoryId;
                                var filterValues = filterValueRepo.GetListBySpec(new FilterValueSpecs.GetByIds(x.FilterValueIds)).Result.ToList();
                                var imagesTasks = x.ImagePaths.Select(async (path, index) =>
                                    new AdvertImage()
                                    {
                                        Priority = index,
                                        Name = await imageService.SaveImageFromUrlAsync(path)
                                    });
                                var images = await Task.WhenAll(imagesTasks);
                                return new Advert()
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
                                    Settlement = await settlementRepo.GetByIDAsync(x.SettlementRef) ??
                                      throw new NullReferenceException("settlement not found")
                                };
                            });
                            var adverts = await Task.WhenAll(advertsTasks);
                            Console.WriteLine($"Adding {adverts.Length} adverts to the database.");
                            await advertRepo.AddRangeAsync(adverts);
                            await advertRepo.SaveAsync();
                            Console.WriteLine("Adverts added to the database.");
                        }
                    }
                    catch (JsonException)
                    {
                        Console.WriteLine("Error deserialize adverts json file");
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

            var byParent = categories
                .GroupBy(c => c.ParentId)
                .ToDictionary(g => g.Key, g => g.ToList());

            List<Category>? level = byParent.TryGetValue(null, out var roots) ? roots : null;
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
            IImageService imageService)
        {
            var categoryTasks =  models.Select(async (x) => 
            {
                var advertFilters = x.Filters?.Any() ?? false ? filters.Where(z => x.Filters.Contains(z.Name)) : null;
                var childs = x.Childs?.Any() ?? false ? await GetCategories(x.Childs, filters, imageService) : null;
                var image = !String.IsNullOrEmpty(x.Image)
                    ? await imageService.SaveImageFromUrlAsync(x.Image)
                    : null;
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
