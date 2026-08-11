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

        public async Task<AdvertDto> GetByIdAsync(int id)
        {
            var advert = await mapper.ProjectTo<AdvertDto>(advertRepository.GetQuery().AsNoTracking().Where(x => x.Id == id)).SingleOrDefaultAsync()
                ?? throw new HttpException(Errors.InvalidAdvertId, HttpStatusCode.BadRequest);
            return advert.WithOnlineStatus(connectionTracker);
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
                    return await GetBalancedRandomPageAsync(query, filter, pageRequest.Size, connectionTracker);
                }

                var paginationBuilder = new PaginationBuilder<AdvertDto>(query);
                var sortData = new AdvertSortData(pageRequest.IsDescending, pageRequest.SortKey);
                var page = await paginationBuilder.GetPageAsync(pageRequest.Page, pageRequest.Size, filter, sortData);
                return new()
                {
                    Total = page.Total,
                    Items = page.Items.WithOnlineStatus(connectionTracker)
                };
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to load advert page from the database; returning an empty page.");
                return new() { Total = 0, Items = [] };
            }
        }

        private static async Task<PageResponse<AdvertDto>> GetBalancedRandomPageAsync(IQueryable<AdvertDto> query, AdvertFilter filter, int size, IConnectionTracker connectionTracker)
        {
            var filtered = filter.FilterQuery(query);
            var total = await filtered.CountAsync();

            // Random order pushed down to the DB (Guid.NewGuid() per row), capped to a candidate
            // pool big enough to give every category a fair shot without loading the whole table.
            var poolSize = Math.Max(size * 12, 200);
            var candidates = await filtered.OrderBy(x => Guid.NewGuid()).Take(poolSize).ToListAsync();

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
            }
            else throw new HttpException(Errors.AdvertIsBlocked, HttpStatusCode.BadRequest);
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
        }

        public async Task BuyAsync(int advertId)
        {
           var user =  await userManager.UpdateUserActivityAsync(httpContext);
            var advert = await advertRepository.GetItemBySpec(new AdvertSpecs.GetById(advertId, AdvertOpt.User | AdvertOpt.Images))
                ?? throw new HttpException(Errors.InvalidAdvertId, HttpStatusCode.BadRequest);
            advert.Completed = true;
            await advertRepository.SaveAsync();

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
            var accountBlockedTemplate = EmailTemplates.GetAdvertBoughtTemplate(content);
            await emailService.SendAsync(advert.User.Email ?? string.Empty, Messages.AdvertLocked, accountBlockedTemplate, true);
        }
    }
}
