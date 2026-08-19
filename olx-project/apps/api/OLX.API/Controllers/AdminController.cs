using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Olx.BLL.Entities;
using Olx.BLL.Helpers;
using Olx.BLL.Interfaces;
using Olx.BLL.Models.Advert;
using Olx.BLL.Models.Category;
using Olx.BLL.Models.User;

namespace OLX.API.Controllers
{
    // Адмін-панель: агрегує дані для дашборду (Головна/Замовлення/Товари) поверх існуючих
    // репозиторіїв — жодних окремих "статусів замовлення" в БД не зберігається (Order у цій
    // системі не має життєвого циклу оплата->обробка->відправка), тому "Оплачено" — єдиний
    // реальний статус, що відповідає фактичним даним; лічильники інших статусів чесно нульові,
    // доки бізнес-логіка не почне їх виставляти.
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = Roles.Admin)]
    public class AdminController(
        IUserService userService,
        IAccountService accountService,
        ICategoryService categoryService,
        IAdvertService advertService,
        IAiService aiService,
        IRepository<Order> orderRepo,
        IRepository<Advert> advertRepo) : ControllerBase
    {
        // GET /api/Admin/users — таблиця користувачів для UsersPage
        // (id/name/email/role/status/registerDate). Optional ?page=&size= switches to a paged
        // { items, total } response for larger user bases; omitted, it returns the full flat
        // array as before (non-breaking for existing UsersPage callers).
        [HttpGet("users")]
        public async Task<IActionResult> GetUsers([FromQuery] int? page = null, [FromQuery] int? size = null)
        {
            var users = await userService.Get(false);
            var lockedIds = (await userService.GetLocked()).Select(x => x.Id).ToHashSet();

            var projected = users.Select(u => new
            {
                id = u.Id,
                name = $"{u.FirstName} {u.LastName}".Trim(),
                email = u.Email,
                role = Roles.User,
                status = lockedIds.Contains(u.Id) ? "blocked" : "active",
                registerDate = u.CreatedDate.ToString("yyyy-MM-dd")
            }).ToList();

            if (page.HasValue && size.HasValue && size.Value > 0)
            {
                var total = projected.Count;
                var items = projected.Skip((Math.Max(page.Value, 1) - 1) * size.Value).Take(size.Value);
                return Ok(new { items, total });
            }

            return Ok(projected);
        }

        // POST /api/Admin/users/{id}/toggle-block — блокує/розблоковує користувача (легасі-шлях, лишається для сумісності).
        [HttpPost("users/{id:int}/toggle-block")]
        public async Task<IActionResult> ToggleUserBlock([FromRoute] int id) => await ToggleUserBan(id);

        // PUT /api/admin/users/{id}/toggle-ban — те саме перемикання блокування облікового
        // запису, під іменем/дієсловом, що відповідає адмінському API-контракту.
        [HttpPut("users/{id:int}/toggle-ban")]
        public async Task<IActionResult> ToggleUserBan([FromRoute] int id)
        {
            var lockedIds = (await userService.GetLocked()).Select(x => x.Id).ToHashSet();
            var isLocked = lockedIds.Contains(id);

            await accountService.BlockUserAsync(new UserBlockModel
            {
                UserIds = new[] { id },
                Lock = !isLocked
            });

            return Ok();
        }

        // PUT /api/admin/users/{id}/confirm-email — примусово підтверджує email користувача.
        [HttpPut("users/{id:int}/confirm-email")]
        public async Task<IActionResult> ConfirmUserEmail([FromRoute] int id)
        {
            await accountService.ForceConfirmEmailAsync(id);
            return Ok();
        }

        // GET /api/admin/categories — плаский список категорій (перевикористовує ICategoryService.Get()).
        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories() => Ok(await categoryService.Get());

        // POST /api/admin/categories — створює категорію з перекладеними назвами/slug/іконкою.
        [HttpPost("categories")]
        public async Task<IActionResult> CreateCategory([FromForm] CategoryCreationModel model) =>
            Ok(await categoryService.CreateAsync(model));

        // PUT /api/admin/categories/{id} — редагує категорію (включно з перекладами/slug/іконкою).
        [HttpPut("categories/{id:int}")]
        public async Task<IActionResult> UpdateCategory([FromRoute] int id, [FromForm] CategoryCreationModel model)
        {
            // CategoryCreationModel is a plain init-only class (not a record), so the route id
            // is applied via a fresh copy rather than a `with` expression.
            var editModel = new CategoryCreationModel
            {
                Id = id,
                Name = model.Name,
                NameUk = model.NameUk,
                NameEn = model.NameEn,
                Slug = model.Slug,
                ImageFile = model.ImageFile,
                CurrentImage = model.CurrentImage,
                ParentId = model.ParentId,
                FilterIds = model.FilterIds
            };
            return Ok(await categoryService.EditAsync(editModel));
        }

        // DELETE /api/admin/categories/{id} — видаляє категорію.
        [HttpDelete("categories/{id:int}")]
        public async Task<IActionResult> DeleteCategory([FromRoute] int id)
        {
            await categoryService.RemoveAsync(id);
            return Ok();
        }

        // POST /api/admin/categories/reorder — масово оновлює SortOrder (drag-and-drop у CategoriesPage).
        [HttpPost("categories/reorder")]
        public async Task<IActionResult> ReorderCategories([FromBody] CategoryReorderRequest request)
        {
            await categoryService.ReorderAsync(request);
            return Ok();
        }

        // GET /api/admin/newsletter/subscribers-count — скільки користувачів підписані
        // (NewsletterSubscribed == true), для панелі "Маркетинг" перед розсилкою.
        [HttpGet("newsletter/subscribers-count")]
        public async Task<IActionResult> GetNewsletterSubscribersCount([FromServices] IRepository<OlxUser> userRepo) =>
            Ok(new { count = await userRepo.CountAsync(u => u.NewsletterSubscribed) });

        // POST /api/admin/newsletter/send — розсилає лист усім підписаним користувачам
        // (OlxUser.NewsletterSubscribed == true). Повертає кількість отримувачів.
        [HttpPost("newsletter/send")]
        public async Task<IActionResult> SendNewsletter([FromBody] NewsletterBroadcastModel model)
        {
            var sentCount = await accountService.SendNewsletterAsync(model);
            return Ok(new { sentCount });
        }

        // POST /api/admin/categories/auto-translate — Gemini генерує UK/EN назви + slug з короткого промпту.
        [HttpPost("categories/auto-translate")]
        public async Task<IActionResult> AutoTranslateCategory([FromBody] CategoryAutoTranslateRequest request)
        {
            var result = await aiService.GenerateCategoryTranslationAsync(request.Prompt);
            return Ok(result);
        }

        // PUT /api/admin/adverts/{id} — редагує будь-яке поле будь-якого оголошення (обхід перевірки власника).
        [HttpPut("adverts/{id:int}")]
        public async Task<IActionResult> UpdateAdvert([FromRoute] int id, [FromBody] AdminAdvertUpdateModel model) =>
            Ok(await advertService.AdminUpdateAsync(id, model));

        // DELETE /api/admin/adverts/{id} — видаляє будь-яке оголошення.
        [HttpDelete("adverts/{id:int}")]
        public async Task<IActionResult> DeleteAdvert([FromRoute] int id)
        {
            await advertService.DeleteAsync(id);
            return Ok();
        }

        // GET /api/Admin/orders — усі замовлення в системі (адмінський перегляд).
        [HttpGet("orders")]
        public async Task<IActionResult> GetOrders()
        {
            var orders = await orderRepo.GetQuery()
                .Include(o => o.User)
                .Include(o => o.Items)
                .OrderByDescending(o => o.Date)
                .ToListAsync();

            var result = orders.Select(o => new
            {
                id = o.Id,
                customerName = $"{o.User.FirstName} {o.User.LastName}".Trim(),
                productName = BuildProductSummary(o.Items.Select(i => i.Title)),
                price = o.TotalPrice,
                status = "paid",
                date = o.Date
            });

            return Ok(result);
        }

        // GET /api/Admin/products — товари (оголошення) для адмін-таблиці "Товари".
        [HttpGet("products")]
        public async Task<IActionResult> GetProducts()
        {
            var salesByAdvertIdList = await orderRepo.GetQuery()
                .SelectMany(o => o.Items)
                .Where(i => i.AdvertId != null)
                .GroupBy(i => i.AdvertId!.Value)
                .Select(g => new { AdvertId = g.Key, Count = g.Sum(x => x.Quantity) })
                .ToListAsync();
            var salesByAdvertId = salesByAdvertIdList.ToDictionary(x => x.AdvertId, x => x.Count);

            var adverts = await advertRepo.GetQuery()
                .Include(a => a.Category)
                .OrderByDescending(a => a.Date)
                .ToListAsync();

            var result = adverts.Select(a => new
            {
                id = a.Id,
                title = a.Title,
                category = a.Category != null ? a.Category.Name : "",
                price = a.Price,
                status = a.Blocked ? "blocked" : a.Completed ? "sold" : a.Approved ? "active" : "pending",
                salesCount = salesByAdvertId.TryGetValue(a.Id, out var count) ? count : 0
            });

            return Ok(result);
        }

        // GET /api/Admin/sellers — користувачі, що мають хоча б одне оголошення, з агрегованою статистикою.
        [HttpGet("sellers")]
        public async Task<IActionResult> GetSellers()
        {
            var adverts = await advertRepo.GetQuery().ToListAsync();
            var users = (await userService.Get(false)).ToList();

            var salesByAdvertIdList = await orderRepo.GetQuery()
                .SelectMany(o => o.Items)
                .Where(i => i.AdvertId != null)
                .GroupBy(i => i.AdvertId!.Value)
                .Select(g => new { AdvertId = g.Key, Count = g.Sum(x => x.Quantity) })
                .ToListAsync();
            var salesByAdvertId = salesByAdvertIdList.ToDictionary(x => x.AdvertId, x => x.Count);

            var result = adverts
                .GroupBy(a => a.UserId)
                .Select(g =>
                {
                    var user = users.FirstOrDefault(u => u.Id == g.Key);
                    var salesCount = g.Sum(a => salesByAdvertId.TryGetValue(a.Id, out var c) ? c : 0);
                    return new
                    {
                        id = g.Key,
                        name = user is not null ? $"{user.FirstName} {user.LastName}".Trim() : $"Користувач #{g.Key}",
                        email = user?.Email ?? "",
                        productsCount = g.Count(),
                        salesCount,
                        rating = user?.Rating ?? 0,
                    };
                })
                .OrderByDescending(x => x.productsCount)
                .ToList();

            return Ok(result);
        }

        // GET /api/Admin/dashboard/overview?period=week|month|year — метрики + дінаміка продажів.
        [HttpGet("dashboard/overview")]
        public async Task<IActionResult> GetOverview([FromQuery] string period = "week")
        {
            var now = DateTime.UtcNow;

            var orders = await orderRepo.GetQuery()
                .Include(o => o.User)
                .Include(o => o.Items)
                .ToListAsync();

            var adverts = await advertRepo.GetQuery().ToListAsync();

            var usersDto = await userService.Get(false);
            var users = usersDto.ToList();

            var sellerIds = adverts.Select(a => a.UserId).Distinct().ToHashSet();

            // --- Metric cards: current 30-day window vs the previous 30-day window ---
            var windowStart = now.AddDays(-30);
            var prevWindowStart = now.AddDays(-60);

            var totalSold = orders.Sum(o => o.TotalPrice);
            var totalSoldPrev = orders.Where(o => o.Date >= prevWindowStart && o.Date < windowStart).Sum(o => o.TotalPrice);
            var totalSoldCurr = orders.Where(o => o.Date >= windowStart).Sum(o => o.TotalPrice);

            var ordersCount = orders.Count;
            var ordersCountPrev = orders.Count(o => o.Date >= prevWindowStart && o.Date < windowStart);
            var ordersCountCurr = orders.Count(o => o.Date >= windowStart);

            var usersCount = users.Count;
            var usersCountPrev = users.Count(u => u.CreatedDate >= prevWindowStart && u.CreatedDate < windowStart);
            var usersCountCurr = users.Count(u => u.CreatedDate >= windowStart);

            var sellersCount = sellerIds.Count;
            var sellersCountCurr = adverts.Where(a => a.Date >= windowStart).Select(a => a.UserId).Distinct().Count();
            var sellersCountPrev = adverts.Where(a => a.Date >= prevWindowStart && a.Date < windowStart).Select(a => a.UserId).Distinct().Count();

            static double Trend(decimal curr, decimal prev) => prev == 0 ? (curr > 0 ? 100 : 0) : (double)((curr - prev) / prev * 100);
            static double TrendInt(int curr, int prev) => prev == 0 ? (curr > 0 ? 100 : 0) : (curr - prev) / (double)prev * 100;

            // --- Sales dynamics chart buckets ---
            var salesDynamics = BuildSalesDynamics(orders, period, now);

            // --- Order status breakdown: real data has a single lifecycle state (paid on creation) ---
            var orderStatusBreakdown = new[]
            {
                new { status = "paid", label = "Оплачені", count = orders.Count, percent = orders.Count > 0 ? 100.0 : 0.0 },
                new { status = "processing", label = "В обробці", count = 0, percent = 0.0 },
                new { status = "shipped", label = "Відправлені", count = 0, percent = 0.0 },
                new { status = "cancelled", label = "Скасовані", count = 0, percent = 0.0 },
            };

            // --- Recent orders (latest 5) ---
            var recentOrders = orders
                .OrderByDescending(o => o.Date)
                .Take(5)
                .Select(o => new
                {
                    id = o.Id,
                    customerName = $"{o.User.FirstName} {o.User.LastName}".Trim(),
                    productName = BuildProductSummary(o.Items.Select(i => i.Title)),
                    price = o.TotalPrice,
                    status = "paid",
                    date = o.Date
                });

            // --- Popular products: ranked by real sales count, tie-broken by favorites count ---
            var salesByAdvertId = orders
                .SelectMany(o => o.Items)
                .Where(i => i.AdvertId != null)
                .GroupBy(i => i.AdvertId!.Value)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Quantity));

            var popularProducts = adverts
                .Select(a => new
                {
                    id = a.Id,
                    title = a.Title,
                    price = a.Price,
                    salesCount = salesByAdvertId.TryGetValue(a.Id, out var c) ? c : 0,
                    favoritesCount = a.FavoritedByUsers.Count
                })
                .OrderByDescending(x => x.salesCount)
                .ThenByDescending(x => x.favoritesCount)
                .Take(5);

            return Ok(new
            {
                metrics = new
                {
                    totalSold = new { value = totalSold, trend = Trend(totalSoldCurr, totalSoldPrev) },
                    orders = new { value = ordersCount, trend = TrendInt(ordersCountCurr, ordersCountPrev) },
                    users = new { value = usersCount, trend = TrendInt(usersCountCurr, usersCountPrev) },
                    sellers = new { value = sellersCount, trend = TrendInt(sellersCountCurr, sellersCountPrev) },
                },
                salesDynamics,
                orderStatusBreakdown,
                recentOrders,
                popularProducts
            });
        }

        private static string BuildProductSummary(IEnumerable<string> titles)
        {
            var list = titles.ToList();
            if (list.Count == 0) return "";
            if (list.Count == 1) return list[0];
            return $"{list[0]} +{list.Count - 1}";
        }

        private static readonly string[] DayLabels = { "Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб" };
        private static readonly string[] MonthLabels =
        {
            "Січ", "Лют", "Бер", "Кві", "Тра", "Чер", "Лип", "Сер", "Вер", "Жов", "Лис", "Гру"
        };

        private static object BuildSalesDynamics(List<Order> orders, string period, DateTime now)
        {
            if (period == "year")
            {
                var buckets = new List<object>();
                for (var i = 11; i >= 0; i--)
                {
                    var month = now.AddMonths(-i);
                    var sum = orders.Where(o => o.Date.Year == month.Year && o.Date.Month == month.Month).Sum(o => o.TotalPrice);
                    buckets.Add(new { label = MonthLabels[month.Month - 1], value = sum });
                }
                return buckets;
            }

            if (period == "month")
            {
                var buckets = new List<object>();
                for (var i = 4; i >= 0; i--)
                {
                    var weekEnd = now.AddDays(-7 * i);
                    var weekStart = weekEnd.AddDays(-6);
                    var sum = orders.Where(o => o.Date >= weekStart.Date && o.Date < weekEnd.Date.AddDays(1)).Sum(o => o.TotalPrice);
                    buckets.Add(new { label = $"Тиж {5 - i}", value = sum });
                }
                return buckets;
            }

            // default: week — last 7 days
            var dayBuckets = new List<object>();
            for (var i = 6; i >= 0; i--)
            {
                var day = now.AddDays(-i).Date;
                var sum = orders.Where(o => o.Date.Date == day).Sum(o => o.TotalPrice);
                dayBuckets.Add(new { label = DayLabels[(int)day.DayOfWeek], value = sum });
            }
            return dayBuckets;
        }
    }
}
