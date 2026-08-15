
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Olx.BLL.Helpers;
using Olx.BLL.Interfaces;
using Olx.BLL.Models.Advert;


namespace OLX.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    // Контролер оголошень: забезпечує CRUD-операції, фільтрацію, підтвердження та управління статусами оголошень.
    public class AdvertController(IAdvertService advertService) : ControllerBase
    {
        // Повертає список усіх доступних оголошень.
        [HttpGet("get")]
        public async Task<IActionResult> GetAll() => Ok(await advertService.GetAllAsync());

        // Повертає одне оголошення за ідентифікатором.
        [HttpGet("get/{id:int}")]
        public async Task<IActionResult> GetById([FromRoute] int id) => Ok(await advertService.GetByIdAsync(id));

        // Повертає оголошення поточного користувача.
        // [Authorize] (not Roles = Roles.User): DbSeeder/AccountService.AddUserAsync only ever
        // grants an account ONE role (Admin xor User, never both), so an Admin account never
        // carries the "User" role claim and would 403 here under a Roles.User-gated [Authorize]
        // even though "my own adverts" is a perfectly valid thing for an admin to look at.
        [Authorize]
        [HttpGet("get/user")]
        public async Task<IActionResult> GetUserAdverts() => Ok(await advertService.GetUserAdvertsAsync());

        // Повертає заблоковані оголошення поточного користувача.
        [Authorize]
        [HttpGet("get/user/locked")]
        public async Task<IActionResult> GetLockedUserAdverts() => Ok(await advertService.GetUserAdvertsAsync(locked:true));

        // Повертає завершені оголошення поточного користувача.
        [Authorize]
        [HttpGet("get/user/completed")]
        public async Task<IActionResult> GetCompletedUserAdverts() => Ok(await advertService.GetUserAdvertsAsync(completed:true));

        // Повертає оголошення конкретного користувача для адміністратора.
        [Authorize(Roles = Roles.Admin)]
        [HttpGet("get/user/{id:int}")]
        public async Task<IActionResult> GetByUserId([FromRoute] int id) => Ok(await advertService.GetByUserId(id));

        // Повертає зображення оголошення за його ідентифікатором.
        [HttpGet("get/images/{id:int}")]
        public async Task<IActionResult> GetImagesByUserId([FromRoute] int id) => Ok(await advertService.GetImagesAsync(id));

        // Повертає сторінку оголошень за параметрами запиту.
        [HttpPost("get/page")]
        public async Task<IActionResult> GetPage([FromBody] AdvertPageRequest advertPageRequest) =>
            Ok(await advertService.GetPageAsync(advertPageRequest));

        // Повертає список оголошень за набір ідентифікаторів.
        [HttpPost("get/range")]
        public async Task<IActionResult> GetRange([FromBody] IEnumerable<int> ids) => Ok(await advertService.GetRangeAsync(ids));

        // Змінює статус блокування оголошення адміністратором.
        [Authorize(Roles = Roles.Admin)]
        [HttpPost("block")]
        public async Task<IActionResult> SetLockedStatus([FromBody] AdvertLockRequest lockRequest)
        {
            await advertService.SetLockedStatusAsync(lockRequest);
            return Ok();
        }

        // Підтверджує оголошення адміністратором.
        [Authorize(Roles = Roles.Admin)]
        [HttpPost("approve/{advertId:int}")]
        public async Task<IActionResult> Approve([FromRoute] int advertId)
        {
            await advertService.ApproveAsync(advertId);
            return Ok();
        }

        // Оновлює існуюче оголошення власником.
        [Authorize]
        [HttpPost("update")]
        public async Task<IActionResult> Update([FromForm] AdvertCreationModel creationModel) =>
            Ok(await advertService.UpdateAsync(creationModel));

        // Позначає оголошення як завершене власником.
        [Authorize]
        [HttpPost("complete/{advertId:int}")]
        public async Task<IActionResult> CompleteAdvert([FromRoute] int advertId)
        {
            await advertService.SetCompletedAsync(advertId);
            return  Ok();
        }

        // Позначає оголошення як придбане користувачем.
        [Authorize]
        [HttpPost("buy/{advertId:int}")]
        public async Task<IActionResult> BuyAdvert([FromRoute] int advertId)
        {
            await advertService.BuyAsync(advertId);
            return Ok();
        }

        // Створює нове оголошення від імені авторизованого користувача.
        [Authorize]
        [HttpPut("create")]
        public async Task<IActionResult> Create([FromForm] AdvertCreationModel creationModel) => 
            Ok(await advertService.CreateAsync(creationModel));
        
        // Видаляє оголошення за його ідентифікатором.
        [Authorize]
        [HttpDelete("delete/{id:int}")]
        public async Task<IActionResult> Delete([FromRoute] int id)
        {
            await advertService.DeleteAsync(id);
            return Ok();
        }

        // Видаляє всі завершені оголошення поточного користувача.
        [Authorize]
        [HttpDelete("delete/completed/all")]
        public async Task<IActionResult> DeleteCompleted() => Ok( await advertService.RemoveCompletedAsync());
       
    }
}
