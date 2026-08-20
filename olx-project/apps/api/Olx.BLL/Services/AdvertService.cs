using AutoMapper;
using Olx.BLL.DTOs;
using Olx.BLL.Entities;
using Olx.BLL.Interfaces;
using Olx.BLL.Models.Advert;
using Olx.BLL.Pagination.SortData;
using Olx.BLL.Pagination;
using Olx.BLL.Pagination.Filters;
using Olx.BLL.Models.Page;
using Olx.BLL.Exceptions;
using Olx.BLL.Resources;
using System.Net;
using Olx.BLL.Specifications;
using FluentValidation;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Olx.BLL.Exstensions;
using Olx.BLL.Entities.NewPost;
using Microsoft.EntityFrameworkCore;
using Olx.BLL.DTOs.AdvertDtos;
using Olx.BLL.Models.AdminMessage;
using Olx.BLL.Helpers;
using NETCore.MailKit.Core;
using Olx.BLL.Helpers.Email;
using Microsoft.AspNetCore.SignalR;
using Olx.BLL.Hubs;
using SixLabors.ImageSharp;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Pgvector;
using Pgvector.EntityFrameworkCore;


namespace Olx.BLL.Services
{
    public class AdvertService(
        IRepository<Advert> advertRepository,
        IRepository<Category> categorytRepository,
        IRepository<Settlement> settlementRepository,
        IRepository<AdvertImage> imageRepository,
        UserManager<OlxUser> userManager,
        IFilterValueService filterValueService,
        IImageService imageService,
        IHttpContextAccessor httpContext,
        IAdminMessageService adminMessageService,
        IEmailService emailService,
        IMapper mapper,
        IHubContext<MessageHub> hubContext,
        IConnectionTracker connectionTracker,
        IValidator<AdvertCreationModel> advertCreationModelValidator,
        ICacheService cacheService,
        IAdvertViewCounterService viewCounterService,
        ILogger<AdvertService> logger) : IAdvertService
    {
       
        public async Task<AdvertDto> CreateAsync(AdvertCreationModel advertModel)
        {
            advertCreationModelValidator.ValidateAndThrow(advertModel);
            var curentUser = await userManager.UpdateUserActivityAsync(httpContext);
            if (curentUser.Id != advertModel.UserId)
            {
                throw new HttpException(Errors.InvalidUserId, HttpStatusCode.BadRequest);
            }
            if (!await categorytRepository.AnyAsync(x => x.Id == advertModel.CategoryId))
            {
                throw new HttpException(Errors.InvalidCategoryId, HttpStatusCode.BadRequest);
            }
            if (!await settlementRepository.AnyAsync(x => x.Ref == advertModel.SettlementRef))
            {
                throw new HttpException(Errors.InvalidSettlementId, HttpStatusCode.BadRequest);
            }

            var advert = mapper.Map<Advert>(advertModel);

            // New listings must be immediately visible in the public catalog/feed — the storefront
            // (UserHomePage, CategoryListingPage, AdvertDetailsPage's related/seller carousels) all
            // query GetAdvertsPage with approved: true, and Advert.Approved defaults to false. Without
            // this, every freshly created advert silently sat in "pending admin approval" limbo and
            // never showed up anywhere a seller (or anyone else) could find it, looking exactly like
            // "the advert wasn't saved" even though CreateAsync/SaveAsync below succeeded. Mirrors
            // DbSeeder's demo data, which is also created with Approved = true.
            advert.Approved = true;

            var images = advertModel.ImageFiles.Select(async (x, index) => new AdvertImage()
            {
                Priority = index,
                Name = await imageService.SaveImageAsync(x)
            });

            advert.Images = await Task.WhenAll(images);
            if (advertModel.FilterValueIds.Count != 0)
            {
                var values = await filterValueService.GetByIdsAsync(advertModel.FilterValueIds);
                advert.FilterValues = values.ToList();
            }

            await advertRepository.AddAsync(advert);
            await advertRepository.SaveAsync();
            return mapper.Map<AdvertDto>(advert).WithOnlineStatus(connectionTracker);
        }

        public async Task DeleteAsync(int id)
        {
           var user =  await userManager.UpdateUserActivityAsync(httpContext);
            var advert = await advertRepository.GetItemBySpec( new AdvertSpecs.GetById(id,AdvertOpt.User))
                ?? throw new HttpException(Errors.InvalidAdvertId,HttpStatusCode.BadRequest);
            advertRepository.Delete(advert);
            await advertRepository.SaveAsync();
            await cacheService.RemoveAsync(CacheKeys.AdvertById(id));
            if (await userManager.IsInRoleAsync(user, Roles.Admin))
            {
                var message = new AdminMessageCreationModel
                {
                    MessageLogo = advert.Images.FirstOrDefault(x => x.Priority == 0)?.Name,
                    Content = Messages.AdvertDeletedDefault,
                    Subject =string.Format(Messages.AdminDeleteAdvert, advert.Title),
                    UserId = advert.UserId
                };
                await adminMessageService.SendToUser(message);
                var accountBlockedTemplate = EmailTemplates.GetAdvertRemovedTemplate($"{message.Subject} {message.Content}");
                await emailService.SendAsync(advert.User.Email ?? string.Empty, Messages.AdvertDeleted, accountBlockedTemplate, true);
                await hubContext.Clients.Users(advert.UserId.ToString())
                  .SendAsync(HubMethods.AdminDeleteAdvert);
                return;
            }
        }

        public async Task<IEnumerable<AdvertDto>> GetRangeAsync(IEnumerable<int> ids) =>
            (await mapper.ProjectTo<AdvertDto>(advertRepository.GetQuery().AsNoTracking().Where(x => ids.Contains(x.Id) && !x.Blocked && !x.Completed)).ToArrayAsync())
                .WithOnlineStatus(connectionTracker);

        // Falls back to an empty list instead of letting a DB outage bubble up as a raw 500 on
        // the public Advert/get endpoint — the storefront can still render (just without
        // listings) rather than hard-failing.
        public async Task<IEnumerable<AdvertDto>> GetAllAsync()
        {
            try
            {
                return (await mapper.ProjectTo<AdvertDto>(advertRepository.GetQuery().AsNoTracking().Where(x => !x.Blocked && !x.Completed)).ToArrayAsync())
                    .WithOnlineStatus(connectionTracker);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to load adverts from the database; returning an empty list.");
                return [];
            }
        }

        public async Task<IEnumerable<AdvertDto>> GetUserAdvertsAsync(bool locked = false,bool completed = false)
        {
            var curentUser = await userManager.UpdateUserActivityAsync(httpContext);
            var adverts = await mapper.ProjectTo<AdvertDto>(advertRepository.GetQuery().AsNoTracking().Where(x => x.UserId == curentUser.Id && x.Blocked == locked && x.Completed == completed)).ToArrayAsync();
            return adverts.WithOnlineStatus(connectionTracker);
        }

        public async Task<IEnumerable<AdvertDto>> GetByUserId(int userId)
        {
            await userManager.UpdateUserActivityAsync(httpContext);
            _ = await userManager.FindByIdAsync(userId.ToString())
                ?? throw new HttpException(Errors.InvalidUserId,HttpStatusCode.BadRequest);
            var adverts = await mapper.ProjectTo<AdvertDto>(advertRepository.GetQuery().AsNoTracking().Where(x => x.UserId == userId && !x.Blocked && !x.Completed)).ToArrayAsync();
            return adverts.WithOnlineStatus(connectionTracker);
        }

        // The mapped AdvertDto itself is cached, but WithOnlineStatus is applied *after* every
        // cache read (hit or miss): IsOnline is backed by the in-memory IConnectionTracker on
        // this node, not a DB column, so it must never be baked into a value that's shared across
        // requests (or, via L2, across nodes) — that would freeze a user's presence at whatever
        // it was the moment the entry was cached.
        public async Task<AdvertDto> GetByIdAsync(int id)
        {
            var cached = await cacheService.GetOrSetAsync(
                CacheKeys.AdvertById(id),
                async _ => await mapper.ProjectTo<AdvertDto>(advertRepository.GetQuery().AsNoTracking().Where(x => x.Id == id)).SingleOrDefaultAsync()
                    ?? throw new HttpException(Errors.InvalidAdvertId, HttpStatusCode.BadRequest));
            var dto = cached.CloneForPresenceStamping().WithOnlineStatus(connectionTracker);

            // Fast, best-effort view counter (LimiterRedis) — same "never let a side-effect fail
            // the actual request" reasoning as the rest of this Redis architecture: an unreachable
            // LimiterRedis (or IncrementAsync throwing for any other reason) must never turn
            // viewing an advert into a 500. The in-memory IAdvertViewCounterService fallback never
            // throws, so this only matters when the Redis-backed implementation is in play.
            try
            {
                dto.ViewCount = await viewCounterService.IncrementAsync(id);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to increment view counter for advert {AdvertId}.", id);
            }

            return dto;
        }

        public async Task<IEnumerable<AdvertImageDto>> GetImagesAsync(int id) =>
            await mapper.ProjectTo<AdvertImageDto>(imageRepository.GetQuery().AsNoTracking().Where(x => x.AdvertId == id)).ToArrayAsync();
       
        public async Task<PageResponse<AdvertDto>> GetPageAsync(AdvertPageRequest pageRequest)
        {
            try
            {
                var query = mapper.ProjectTo<AdvertDto>(advertRepository.GetQuery().AsNoTracking().Where(x => !x.Completed));
                var filter = mapper.Map<AdvertFilter>(pageRequest);

                // "random" sortKey (used by the homepage recommendation rail) intentionally bypasses
                // plain SQL-level ordering: a straight OrderBy(Guid.NewGuid()) would still statistically
                // skew toward whichever category has the most listings (e.g. Авто), since it's just a
                // random permutation of the same skewed set. Instead pull a bounded random-ordered
                // candidate pool from the DB, then round-robin across distinct categories in-memory so
                // the page mixes categories instead of one dominating it.
                if (string.Equals(pageRequest.SortKey, "random", StringComparison.OrdinalIgnoreCase))
                {
                    return await GetBalancedRandomPageAsync(query, filter, pageRequest.Size, connectionTracker, logger);
                }

                var paginationBuilder = new PaginationBuilder<AdvertDto>(query);
                var sortData = new AdvertSortData(pageRequest.IsDescending, pageRequest.SortKey ?? "id");
                var page = await paginationBuilder.GetPageAsync(pageRequest.Page, pageRequest.Size, filter, sortData);
                return new()
                {
                    Total = page.Total,
                    Items = page.Items.WithOnlineStatus(connectionTracker)
                };
            }
            catch (Exception ex)
            {
                // Context is essential here: this catch turns a real failure into a *silent*
                // empty page (by design, so the storefront still renders), which means the only
                // trace of what actually broke is this log line. Without SortKey/Page/Size/filter
                // context, "failed to load advert page" is nearly useless for tracing which request
                // shape triggered it (e.g. the Guid.NewGuid()-on-Npgsql translation failure that
                // used to silently empty out the homepage "random" recommendations rail).
                logger.LogError(ex,
                    "Failed to load advert page from the database; returning an empty page. " +
                    "SortKey={SortKey} Page={Page} Size={Size} IsDescending={IsDescending} " +
                    "CategoryIds={CategoryIds} UserId={UserId} Search={Search}",
                    pageRequest.SortKey, pageRequest.Page, pageRequest.Size, pageRequest.IsDescending,
                    pageRequest.CategoryIds is null ? "(none)" : string.Join(",", pageRequest.CategoryIds),
                    pageRequest.UserId, pageRequest.Search);
                return new() { Total = 0, Items = [] };
            }
        }

        private static async Task<PageResponse<AdvertDto>> GetBalancedRandomPageAsync(IQueryable<AdvertDto> query, AdvertFilter filter, int size, IConnectionTracker connectionTracker, ILogger logger)
        {
            var filtered = filter.FilterQuery(query);
            var total = await filtered.CountAsync();

            // Random order pushed down to the DB, capped to a candidate pool big enough to give
            // every category a fair shot without loading the whole table.
            //
            // NOTE: this used to be `.OrderBy(x => Guid.NewGuid()).Take(poolSize)` directly on the
            // SQL-translated IQueryable<AdvertDto>. That's a SQL Server idiom (NEWID() has a
            // built-in provider translation there) — Npgsql/PostgreSQL has no translation for
            // Guid.NewGuid(), so EF Core threw "could not be translated" on every single call.
            // GetPageAsync's outer try/catch swallowed that exception and returned an empty page,
            // which is exactly the sortKey=random path the homepage "Рекомендації для вас" rail
            // uses — so every request silently emptied out, and the frontend fell back to local
            // seed data (see UserHomePage/getSeedRecommendedAdverts) whose image references never
            // resolve, hence every card showing the "Немає фото" placeholder while the (unrelated,
            // non-random) advert detail endpoint rendered images fine.
            //
            // Fix: shuffle a plain list of matching ids in memory (cheap, no nested collections to
            // translate), then re-query the real candidate pool by id — fully SQL-translatable
            // (`WHERE Id IN (...)`) and keeps the full AdvertDto projection (Images included).
            var poolSize = Math.Max(size * 12, 200);
            var matchingIds = await filtered.Select(x => x.Id).ToListAsync();
            var poolIds = matchingIds.OrderBy(_ => Guid.NewGuid()).Take(poolSize).ToHashSet();
            var candidates = await filtered.Where(x => poolIds.Contains(x.Id)).ToListAsync();

            if (total > 0 && candidates.Count == 0)
            {
                logger.LogWarning(
                    "GetBalancedRandomPageAsync matched {Total} adverts but the id-based candidate pool came back empty (poolSize={PoolSize}).",
                    total, poolSize);
            }

            var byCategory = candidates
                .GroupBy(x => x.CategoryId)
                .Select(g => new Queue<AdvertDto>(g))
                .OrderBy(_ => Guid.NewGuid())
                .ToList();

            var balanced = new List<AdvertDto>(size);
            while (balanced.Count < size && byCategory.Any(q => q.Count > 0))
            {
                foreach (var group in byCategory)
                {
                    if (group.Count == 0) continue;
                    balanced.Add(group.Dequeue());
                    if (balanced.Count >= size) break;
                }
            }

            return new()
            {
                Total = total,
                Items = balanced.WithOnlineStatus(connectionTracker)
            };
        }

        public async Task<AdvertDto> UpdateAsync(AdvertCreationModel advertModel)
        {
            advertCreationModelValidator.ValidateAndThrow(advertModel);
            var curentUser = await userManager.UpdateUserActivityAsync(httpContext);
            if (curentUser.Id != advertModel.UserId)
            {
                throw new HttpException(Errors.InvalidUserId, HttpStatusCode.BadRequest);
            }

            var advert = await advertRepository.GetItemBySpec(new AdvertSpecs.GetUserAdvertById(curentUser.Id,advertModel.Id, AdvertOpt.Images | AdvertOpt.FilterValues))
                ?? throw new HttpException(Errors.InvalidAdvertId, HttpStatusCode.BadRequest);
            if (!await categorytRepository.AnyAsync(x => x.Id == advertModel.CategoryId))
            {
                throw new HttpException(Errors.InvalidCategoryId, HttpStatusCode.BadRequest);
            }
            if (!await settlementRepository.AnyAsync(x => x.Ref == advertModel.SettlementRef))
            {
                throw new HttpException(Errors.InvalidSettlementId, HttpStatusCode.BadRequest);
            }
            mapper.Map(advertModel, advert);
            var existingImagesNames = advertModel.ImageFiles.Where(x => x.ContentType == "image/existing").Select(x => x.FileName) ?? [];
            var imagesToDelete = advert.Images.Where(x => !existingImagesNames.Contains(x.Name));
            foreach (var image in imagesToDelete)
            {
                image.Advert = null;
            }
            if (advertModel.ImageFiles.Count != 0)
            {
                var priorityFiles = advertModel.ImageFiles.Select((x, index) => new { file = x, index });

                foreach (var file in priorityFiles)
                {

                    if (file.file.ContentType == "image/existing")
                    {
                        var oldImage = advert.Images.FirstOrDefault(x => x.Name == file.file.FileName)!;
                        oldImage.Priority = file.index;
                    }
                    else
                    {
                        var imageName = await imageService.SaveImageAsync(file.file);
                        advert.Images.Add(new AdvertImage
                        {
                            Name = imageName,
                            Priority = file.index
                        });
                    }

                }
             }
            if (advertModel.FilterValueIds.Count != 0)
            {
                var values = await filterValueService.GetByIdsAsync(advertModel.FilterValueIds);
                advert.FilterValues = values.ToList();
            }
            advert.Approved = false;
            advert.Completed = false;
            advert.Blocked = false;
            await advertRepository.SaveAsync();
            await cacheService.RemoveAsync(CacheKeys.AdvertById(advert.Id));
            return mapper.Map<AdvertDto>(advert).WithOnlineStatus(connectionTracker);
        }

        public async Task ApproveAsync(int id)
        {
            await userManager.UpdateUserActivityAsync(httpContext);
            var advert = await advertRepository.GetItemBySpec(new AdvertSpecs.GetById(id))
                ?? throw new HttpException(Errors.InvalidAdvertId, HttpStatusCode.BadRequest);
            if (!advert.Blocked)
            {
                advert.Approved = true;
                await advertRepository.SaveAsync();
                await cacheService.RemoveAsync(CacheKeys.AdvertById(id));
            }
            else throw new HttpException(Errors.AdvertIsBlocked, HttpStatusCode.BadRequest);
        }

        public async Task<AdvertDto> AdminUpdateAsync(int id, AdminAdvertUpdateModel model)
        {
            await userManager.UpdateUserActivityAsync(httpContext);
            var advert = await advertRepository.GetItemBySpec(new AdvertSpecs.GetById(id, AdvertOpt.User | AdvertOpt.Images))
                ?? throw new HttpException(Errors.InvalidAdvertId, HttpStatusCode.BadRequest);

            if (model.CategoryId.HasValue && !await categorytRepository.AnyAsync(x => x.Id == model.CategoryId.Value))
            {
                throw new HttpException(Errors.InvalidCategoryId, HttpStatusCode.BadRequest);
            }

            if (model.Title is not null) advert.Title = model.Title;
            if (model.Description is not null) advert.Description = model.Description;
            if (model.Price.HasValue) advert.Price = model.Price.Value;
            if (model.CategoryId.HasValue) advert.CategoryId = model.CategoryId.Value;
            if (model.IsPromoted.HasValue) advert.Promoted = model.IsPromoted.Value;

            // `Status` (if provided) wins over the individual flags — mirrors the same
            // pending/active/sold/blocked vocabulary AdminController.GetProducts computes.
            if (!string.IsNullOrWhiteSpace(model.Status))
            {
                switch (model.Status.Trim().ToLowerInvariant())
                {
                    case "active": advert.Approved = true; advert.Blocked = false; advert.Completed = false; break;
                    case "blocked": advert.Blocked = true; break;
                    case "sold": advert.Completed = true; advert.Blocked = false; break;
                    case "pending": advert.Approved = false; advert.Blocked = false; advert.Completed = false; break;
                    default: throw new HttpException("Invalid advert status value.", HttpStatusCode.BadRequest);
                }
            }
            else if (model.IsActive.HasValue)
            {
                advert.Approved = model.IsActive.Value;
                if (model.IsActive.Value) advert.Blocked = false;
            }

            await advertRepository.SaveAsync();
            await cacheService.RemoveAsync(CacheKeys.AdvertById(id));
            return mapper.Map<AdvertDto>(advert).WithOnlineStatus(connectionTracker);
        }

        public async Task SetLockedStatusAsync(AdvertLockRequest lockRequest)
        {
           var user = await userManager.UpdateUserActivityAsync(httpContext);
            var advert = await advertRepository.GetItemBySpec(new AdvertSpecs.GetById(lockRequest.Id,AdvertOpt.User))
                 ?? throw new HttpException(Errors.InvalidAdvertId, HttpStatusCode.BadRequest);
            advert.Blocked = lockRequest.Status;
            if (lockRequest.Status)
            {
                var message = new AdminMessageCreationModel
                {
                    MessageLogo = advert.Images.FirstOrDefault(x => x.Priority == 0)?.Name,
                    Content = lockRequest.LockReason ?? Messages.AdvertDeletedDefault,
                    Subject = string.Format(Messages.AdminLockAdvert, advert.Title),
                    UserId = advert.UserId
                };
                await adminMessageService.SendToUser(message);

                var accountBlockedTemplate = EmailTemplates.GetAdvertLockedTemplate($"{message.Subject} {message.Content}");
                await emailService.SendAsync(advert.User.Email ?? string.Empty, Messages.AdvertLocked, accountBlockedTemplate, true);
                await hubContext.Clients.Users(advert.UserId.ToString())
                 .SendAsync(HubMethods.AdminLockAdvert);
            }
            await advertRepository.SaveAsync();
            await cacheService.RemoveAsync(CacheKeys.AdvertById(lockRequest.Id));
        }

        public  async Task<int> RemoveCompletedAsync()
        {
            var user = await userManager.UpdateUserActivityAsync(httpContext);
            var completedAdverts = await advertRepository.GetListBySpec(new AdvertSpecs.GetCompleted(user.Id));
            if (completedAdverts.Any()) 
            {
                advertRepository.DeleteRange(completedAdverts);
                await advertRepository.SaveAsync();
            }
            return completedAdverts.Count();
        }

        public async Task SetCompletedAsync(int advertId)
        {
            await userManager.UpdateUserActivityAsync(httpContext);
            var advertToComplete = await advertRepository.GetByIDAsync(advertId)
                ?? throw new HttpException(Errors.InvalidAdvertId, HttpStatusCode.BadRequest);
            advertToComplete.Completed = true;
            await advertRepository.SaveAsync();
            await cacheService.RemoveAsync(CacheKeys.AdvertById(advertId));
        }

        public async Task BuyAsync(int advertId)
        {
            var user = await userManager.UpdateUserActivityAsync(httpContext);
            var advert = await advertRepository.GetItemBySpec(new AdvertSpecs.GetById(advertId, AdvertOpt.User | AdvertOpt.Images))
                ?? throw new HttpException(Errors.InvalidAdvertId, HttpStatusCode.BadRequest);

            // Instant Buy has no cart/checkout step (unlike OrderService.CreateAsync) to catch
            // this earlier — without this check, a seller could "buy" and thus permanently lock
            // (Completed = true) their own listing.
            if (advert.UserId == user.Id)
            {
                throw new HttpException(Errors.CannotBuyOwnAdvert, HttpStatusCode.BadRequest);
            }

            // Guards against a double purchase (two requests racing, or a stale "Buy" button
            // still on screen after the advert already sold) silently re-sending the "sold"
            // notification/email to the seller a second time.
            if (advert.Completed)
            {
                throw new HttpException(Errors.AdvertAlreadySold, HttpStatusCode.BadRequest);
            }

            advert.Completed = true;
            await advertRepository.SaveAsync();
            await cacheService.RemoveAsync(CacheKeys.AdvertById(advertId));

            // Best-effort seller notification, same reasoning as
            // OrderService.SendOrderConfirmationEmailAsync/TryCreateOrderPlacedNotificationAsync:
            // the purchase itself (advert.Completed, already saved above) must never be undone or
            // surfaced to the buyer as a failure just because the in-app admin message or the
            // seller's email notification hit a hiccup (e.g. SMTP not configured in dev — see
            // AccountService's SendEmailConfirmationMessageAsync for the same caveat). Previously
            // neither call here was guarded, so any failure in either one turned an already-
            // successful purchase into an unhandled 500 for the buyer.
            try
            {
                var buyerName = user.FirstName != null || user.LastName != null
                    ? $"{user.FirstName} {user.LastName}"
                    : user.Email;
                var content = string.Format(Messages.UserBoughtAdvert, buyerName, advert.Title);
                var image = advert.Images.FirstOrDefault(x => x.Priority == 0)?.Name;

                var message = new AdminMessageCreationModel
                {
                    MessageLogo = image,
                    Content = content,
                    Subject = string.Format(Messages.UserBouth),
                    UserId = advert.UserId
                };
                await adminMessageService.SendToUser(message);

                // advert.User is normally populated (AdvertOpt.User was requested above), but
                // stays null-safe in case of a data-integrity gap (e.g. the seller's account was
                // since removed) — a missing/empty seller email just skips the email step instead
                // of throwing a NullReferenceException.
                if (!string.IsNullOrWhiteSpace(advert.User?.Email))
                {
                    var accountBlockedTemplate = EmailTemplates.GetAdvertBoughtTemplate(content);
                    await emailService.SendAsync(advert.User.Email, Messages.AdvertLocked, accountBlockedTemplate, true);
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to notify seller {SellerId} about the purchase of advert {AdvertId}", advert.UserId, advertId);
            }
        }

        // pgvector semantic search (see IAdvertService.SearchSimilarAdvertsAsync doc comment).
        // `.CosineDistance(...)` is Pgvector.EntityFrameworkCore's LINQ extension for
        // Advert.Embedding — EF Core translates it directly into Postgres's native `<=>`
        // pgvector operator, so the ranking/ordering happens in the database, not in memory.
        public async Task<IEnumerable<AdvertDto>> SearchSimilarAdvertsAsync(Vector embedding, int take = 10, int? excludeAdvertId = null)
        {
            var query = advertRepository.GetQuery()
                .Where(x => x.Embedding != null && !x.Blocked && !x.Completed && x.Approved);

            if (excludeAdvertId.HasValue)
            {
                query = query.Where(x => x.Id != excludeAdvertId.Value);
            }

            var ranked = query
                .OrderBy(x => x.Embedding!.CosineDistance(embedding))
                .Take(take);

            var results = await mapper.ProjectTo<AdvertDto>(ranked).ToArrayAsync();
            return results.WithOnlineStatus(connectionTracker);
        }
    }
}
