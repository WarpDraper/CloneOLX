using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Olx.BLL.DTOs.OlxUserDtos;
using Olx.BLL.Entities;
using Olx.BLL.Exceptions;
using Olx.BLL.Exstensions;
using Olx.BLL.Helpers;
using Olx.BLL.Interfaces;
using Olx.BLL.Models.Page;
using Olx.BLL.Models.User;
using Olx.BLL.Pagination;
using Olx.BLL.Pagination.Filters;
using Olx.BLL.Pagination.SortData;
using Olx.BLL.Resources;
using System.Net;

namespace Olx.BLL.Services
{
    public class UserService(
        UserManager<OlxUser> userManager,
        RoleManager<IdentityRole<int>> roleManager,
        IRepository<IdentityUserRole<int>> userRolesRepo,
        IRepository<OlxUser> userRepo,
        IMapper mapper,
        IConnectionTracker connectionTracker) : IUserService
    {
        private async Task<IEnumerable<int>> _getAdminsIds() 
        {
            var adminRole = await roleManager.FindByNameAsync(Roles.Admin) 
                ?? throw new HttpException(Errors.InvalidRole,HttpStatusCode.InternalServerError);
            var adminIds = userRolesRepo.GetQuery()
                .Where(x => x.RoleId == adminRole.Id)
                .Select(z => z.UserId);
            return adminIds;
        }

        public async Task<IEnumerable<OlxUserDto>> Get(bool isAdmin = false) 
        {
            var adminsIds = await _getAdminsIds();
            var users = await mapper.ProjectTo<OlxUserDto>(userRepo.GetQuery()
                .AsNoTracking()
                .Where(x => isAdmin == adminsIds.Contains(x.Id)))
                .ToListAsync();
            return users.WithOnlineStatus(connectionTracker);
        } 

        public async Task<OlxUserDto> Get(int id, bool isAdmin = false)
        {
            var userDto = await mapper.ProjectTo<OlxUserDto>(userRepo.GetQuery().AsNoTracking().Where(x => x.Id == id)).SingleOrDefaultAsync();
            if (userDto is not null)
            {
                // isAdmin=false is the PUBLIC/general lookup (see UserController.Get, [AllowAnonymous]
                // — public seller-profile pages). Any existing user must resolve here regardless of
                // their role: an Admin account is still a real user with a public profile. Previously
                // this compared IsInRoleAsync(...) == isAdmin, which required a NON-admin match for the
                // false case too — so an existing user who happened to hold the Admin role 404'd on
                // their own public profile lookup (GET /api/User/get/{id}) even though the row exists.
                // isAdmin=true (UserController.GetAdmin) intentionally stays role-restricted: it's the
                // admin-management lookup and must only resolve ids that are actually admins.
                if (!isAdmin)
                {
                    return userDto.WithOnlineStatus(connectionTracker);
                }

                var user = await userRepo.GetByIDAsync(id);
                if (user is not null && await userManager.IsInRoleAsync(user, Roles.Admin))
                {
                    return userDto.WithOnlineStatus(connectionTracker);
                }
            }
            // 404, not 400: this id simply doesn't resolve to a user (in the requested
            // admin/non-admin scope) — it's a missing-resource case, not a malformed request.
            // GET /api/User/get/{id} is [AllowAnonymous] (public seller-profile lookups), so
            // callers need a clean 404 they can branch on instead of a validation-style 400.
            throw new HttpException(Errors.InvalidUserId, HttpStatusCode.NotFound);
        }
        

        public async Task<PageResponse<OlxUserDto>> Get(UserPageRequest userPageRequest)
        {
            var adminsIds = await _getAdminsIds();
            var query = mapper.ProjectTo<OlxUserDto>(userRepo.GetQuery()
                .Where(x => adminsIds.Contains(x.Id) == userPageRequest.IsAdmin && ((x.LockoutEnd != null && x.LockoutEnd > DateTime.Now) == userPageRequest.IsLocked))
                .AsNoTracking());
            var paginationBuilder = new PaginationBuilder<OlxUserDto>(query);
            var userFilter = mapper.Map<OlxUserFilter>(userPageRequest);
            var sortData = new OlxUserSortData(userPageRequest.IsDescending,userPageRequest.SortKey);
            var page = await paginationBuilder.GetPageAsync(userPageRequest.Page,userPageRequest.Size,userFilter,sortData);
            return new()
            {
                Total = page.Total,
                Items = page.Items.WithOnlineStatus(connectionTracker)
            };
        }

        public async Task<IEnumerable<OlxUserDto>> GetLocked() =>
            (await mapper.ProjectTo<OlxUserDto>(userRepo.GetQuery().AsNoTracking().Where(x => x.LockoutEnd != null && x.LockoutEnd > DateTime.Now)).ToArrayAsync())
                .WithOnlineStatus(connectionTracker);
    }
}
