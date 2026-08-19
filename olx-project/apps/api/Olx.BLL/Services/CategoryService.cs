using AutoMapper;
using FluentValidation;
using Olx.BLL.DTOs.CategoryDtos;
using Olx.BLL.Entities;
using Olx.BLL.Exceptions;
using Olx.BLL.Interfaces;
using Olx.BLL.Models.Page;
using Olx.BLL.Pagination.Filters;
using Olx.BLL.Pagination.SortData;
using Olx.BLL.Pagination;
using Olx.BLL.Resources;
using Olx.BLL.Specifications;
using System.Net;
using Olx.BLL.Models.Category;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Olx.BLL.Exstensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Olx.BLL.Helpers;


namespace Olx.BLL.Services
{
    public class CategoryService(
        IRepository<Category> categoryRepository,
        IMapper mapper,
        IImageService imageService,
        IValidator<CategoryCreationModel> validator,
        IFilterService filterService,
        UserManager<OlxUser> userManager,
        IHttpContextAccessor httpContext,
        ICacheService cacheService,
        ILogger<CategoryService> logger) : ICategoryService
    {

        // Falls back to an empty list instead of letting a DB outage (unreachable Neon instance,
        // missing table, etc.) bubble up as a raw 500 on the public Category/get endpoint — the
        // storefront can still render (just without categories) rather than hard-failing.
        //
        // Cached via FusionCache: the factory below is only ever invoked (once, even under
        // concurrent requests) on a full L1+L2 miss. If the factory throws — e.g. the database is
        // briefly unreachable — FusionCache's fail-safe transparently serves the last known-good
        // cached value instead of propagating the failure; the try/catch here is a last-resort
        // fallback for the case where there is no previous value at all to fail back to (e.g. a
        // cold cache on first boot with the database also down).
        public async Task<IEnumerable<CategoryDto>> Get()
        {
            try
            {
                return await cacheService.GetOrSetAsync(
                    CacheKeys.AllCategories,
                    async _ => await mapper.ProjectTo<CategoryDto>(categoryRepository.GetQuery().AsNoTracking()).ToArrayAsync());
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to load categories from the database or cache; returning an empty list.");
                return [];
            }
        }

        public async Task<CategoryDto> CreateAsync(CategoryCreationModel creationModel)
        {
            await userManager.UpdateUserActivityAsync(httpContext);
            validator.ValidateAndThrow(creationModel);
            var category = mapper.Map<Category>(creationModel);
            if (creationModel.ImageFile is not null)
            {
                category.Image = await imageService.SaveImageAsync(creationModel.ImageFile);
            }

            if (creationModel.FilterIds?.Any() ?? false)
            {
                var filters = await filterService.GetByIds(creationModel.FilterIds);
                category.Filters = filters.ToList();
            }
            await categoryRepository.AddAsync(category);
            await categoryRepository.SaveAsync();
            await cacheService.RemoveAsync(CacheKeys.AllCategories);
            await cacheService.RemoveAsync(CacheKeys.CategoryTree);
            return mapper.Map<CategoryDto>(category);
        }

        public async Task RemoveAsync(int id)
        {
            await userManager.UpdateUserActivityAsync(httpContext);
            var category = await categoryRepository.GetItemBySpec(new CategorySpecs.GetById(id));
            if (category is not null)
            {
                categoryRepository.Delete(category);
                await categoryRepository.SaveAsync();
                if (category.Image is not null)
                {
                    imageService.DeleteImageIfExists(category.Image);
                }
                await cacheService.RemoveAsync(CacheKeys.AllCategories);
                await cacheService.RemoveAsync(CacheKeys.CategoryById(id));
                await cacheService.RemoveAsync(CacheKeys.CategoryTree);
            }
            else throw new HttpException(Errors.InvalidCategoryId, HttpStatusCode.BadRequest);
        }

        public async Task RemoveTreeAsync(int id)
        {
            await userManager.UpdateUserActivityAsync(httpContext);
            var allCategories = await categoryRepository.GetListBySpec(new CategorySpecs.GetAll());
            var category = allCategories.FirstOrDefault(x => x.Id == id) ??
                throw new HttpException(Errors.InvalidCategoryId, HttpStatusCode.BadRequest);
            List<Category> categoriesToDelete = [category];
            categoriesToDelete.AddRange(GetAllChilds(category.Id,allCategories));
            if (categoriesToDelete.Count > 0)
            {
                categoryRepository.DeleteRange(categoriesToDelete);
                await categoryRepository.SaveAsync();
                var images = categoriesToDelete.Where(x => !String.IsNullOrEmpty(x.Image)).Select(z => z.Image!);
                imageService.DeleteImagesIfExists(images);
                await cacheService.RemoveAsync(CacheKeys.AllCategories);
                await cacheService.RemoveAsync(CacheKeys.CategoryTree);
                foreach (var deleted in categoriesToDelete)
                {
                    await cacheService.RemoveAsync(CacheKeys.CategoryById(deleted.Id));
                }
            }
        }

        public async Task<CategoryDto> EditAsync(CategoryCreationModel editModel)
        {
            await userManager.UpdateUserActivityAsync(httpContext);
            validator.ValidateAndThrow(editModel);
            var category = await categoryRepository.GetItemBySpec( new CategorySpecs.GetById(editModel.Id,CategoryOpt.Filters))
                ?? throw new HttpException(Errors.InvalidCategoryId,HttpStatusCode.BadRequest);
            mapper.Map(editModel, category);
            if (editModel.ParentId.HasValue)
            {
                var parentCategory = await categoryRepository.GetItemBySpec(new CategorySpecs.GetById(editModel.ParentId.Value))
                    ?? throw new HttpException(Errors.InvalidParentCategoryId, HttpStatusCode.BadRequest);
                category.Parent = parentCategory;
            }

            if (String.IsNullOrWhiteSpace(editModel.CurrentImage) || editModel.ImageFile is not null)
            {
                if (!String.IsNullOrWhiteSpace(category.Image))
                {
                    imageService.DeleteImageIfExists(category.Image);
                }
                category.Image = null;
            }

            if (editModel.ImageFile is not null)
            {
                category.Image = await imageService.SaveImageAsync(editModel.ImageFile);
            }

            if (editModel.FilterIds?.Any() ?? false)
            {
                var filters = await filterService.GetByIds(editModel.FilterIds);
                category.Filters = filters.ToList();
            }
            else category.Filters.Clear();
            await categoryRepository.SaveAsync();
            await cacheService.RemoveAsync(CacheKeys.AllCategories);
            await cacheService.RemoveAsync(CacheKeys.CategoryById(category.Id));
            await cacheService.RemoveAsync(CacheKeys.CategoryTree);
            return mapper.Map<CategoryDto>(category);
        }

        public async Task ReorderAsync(CategoryReorderRequest reorderRequest)
        {
            await userManager.UpdateUserActivityAsync(httpContext);
            var ids = reorderRequest.Items.Select(x => x.Id).ToList();
            if (ids.Count == 0) return;

            var categories = await categoryRepository.GetQuery().Where(x => ids.Contains(x.Id)).ToListAsync();
            var sortById = reorderRequest.Items.ToDictionary(x => x.Id, x => x.SortOrder);
            foreach (var category in categories)
            {
                category.SortOrder = sortById[category.Id];
            }
            await categoryRepository.SaveAsync();
            await cacheService.RemoveAsync(CacheKeys.AllCategories);
            await cacheService.RemoveAsync(CacheKeys.CategoryTree);
            foreach (var id in ids)
            {
                await cacheService.RemoveAsync(CacheKeys.CategoryById(id));
            }
        }

        public async Task<CategoryDto> GetById(int id) =>
            await cacheService.GetOrSetAsync(
                CacheKeys.CategoryById(id),
                async _ => await mapper.ProjectTo<CategoryDto>(categoryRepository.GetQuery().AsNoTracking().Where(x => x.Id == id)).SingleOrDefaultAsync()
                    ?? throw new HttpException(Errors.InvalidCategoryId, HttpStatusCode.BadRequest));


        // The storefront mega-menu/category nav asks for this on effectively every page load
        // (default `filters: true`), and it's expensive relative to a flat category read: it
        // pulls every Category row (with Filters + Parent included) and recursively walks
        // ParentId links in BuildTree to reconstruct the nested Childs graph. The tree changes
        // only when an admin creates/edits/removes/reorders a category — far less often than it's
        // read — so it's cached for a full hour (vs. the 10-minute default used elsewhere) under
        // CacheKeys.CategoryTree, with explicit invalidation from every mutating method below so a
        // change is picked up on its next read instead of waiting out the full hour.
        //
        // Only the default `filters: true` shape (the one actual caller, CategoryController.GetTree)
        // is cached; a hypothetical `filters: false` caller bypasses the cache entirely rather than
        // risk serving the wrong variant under the same key.
        public async Task<IEnumerable<CategoryDto>> GetAllTreeAsync(bool filters = true)
        {
            if (!filters)
            {
                var uncached = await categoryRepository.GetListBySpec(new CategorySpecs.GetAll(CategoryOpt.NoTracking | CategoryOpt.Parent));
                return mapper.Map<IEnumerable<CategoryDto>>(BuildTree(null, uncached));
            }

            return await cacheService.GetOrSetAsync(
                CacheKeys.CategoryTree,
                async _ =>
                {
                    var categories = await categoryRepository.GetListBySpec(new CategorySpecs.GetAll(
                        CategoryOpt.NoTracking | CategoryOpt.Filters | CategoryOpt.Parent));
                    return mapper.Map<IEnumerable<CategoryDto>>(BuildTree(null, categories));
                },
                TimeSpan.FromHours(1));
        }
                   
        public async Task<CategoryDto> GetTreeAsync(int categoryId)
        {
            var categories = await categoryRepository.GetListBySpec(new CategorySpecs.GetAll(CategoryOpt.Filters | CategoryOpt.NoTracking));
            var category = categories.FirstOrDefault(x => x.Id == categoryId)
                ?? throw new HttpException(Errors.InvalidCategoryId,HttpStatusCode.BadRequest);
            category.Childs = BuildTree(categoryId, categories).ToHashSet();
            return mapper.Map<CategoryDto>(category);
        }

        
        private IEnumerable<Category> BuildTree(int? parentId, IEnumerable<Category> categories)
        {
            return categories.AsParallel()
                .Where(c => c.ParentId == parentId)
                .Select(c =>
                {
                    c.Childs = BuildTree(c.Id, categories).ToList();
                    return c;
                });
        }

        private IEnumerable<Category> GetAllChilds(int id, IEnumerable<Category> categories)
        {
            var children = categories.Where(c => c.ParentId == id);
            return children.Concat( children.SelectMany(child => GetAllChilds(child.Id, categories)) );
        }

        public async Task<PageResponse<CategoryDto>> GetPageAsync(CategoryPageRequest pageRequest)
        {
            try
            {
                var query = mapper.ProjectTo<CategoryDto>(categoryRepository.GetQuery().AsNoTracking());
                var paginationBuilder = new PaginationBuilder<CategoryDto>(query);
                var filter = new CategoryFilter(pageRequest.SearchName, pageRequest.ParentName);
                var sortData = new CategorySortData(pageRequest.IsDescending, pageRequest.SortKey);
                var page = await paginationBuilder.GetPageAsync(pageRequest.Page, pageRequest.Size, filter, sortData);
                return new()
                {
                    Total = page.Total,
                    Items = page.Items
                };
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to load category page from the database; returning an empty page.");
                return new() { Total = 0, Items = [] };
            }
        }

        
    }
}
