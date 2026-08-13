using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Olx.BLL.Entities;
using Olx.BLL.Helpers;
using Olx.BLL.Interfaces;
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
        IRepository<Order> orderRepo,
        IRepository<Advert> advertRepo) : ControllerBase
    {
        // GET /api/Admin/users — таблиця користувачів для UsersPage (id/name/email/status/registerDate).
        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            var users = await userService.Get(false);
            var lockedIds = (await userService.GetLocked()).Select(x => x.Id).ToHashSet();

            var result = users.Select(u => new
            {
                id = u.Id,
                name = $"{u.FirstName} {u.LastName}".Trim(),
                email = u.Email,
                status = lockedIds.Contains(u.Id) ? "blocked" : "active",
                registerDate = u.CreatedDate.ToString("yyyy-MM-dd")
            });

            return Ok(result);
        }

        // POST /api/Admin/users/{id}/toggle-block — блокує/розблоковує користувача.
        [HttpPost("users/{id:int}/toggle-block")]
        public async Task<IActionResult> ToggleUserBlock([FromRoute] int id)
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
