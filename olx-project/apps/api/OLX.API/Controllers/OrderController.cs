using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Olx.BLL.Helpers;
using Olx.BLL.Interfaces;
using Olx.BLL.Models.Order;

namespace OLX.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    // Контролер замовлень: оформлення кошика (кілька оголошень за один чекаут) в один Order-запис
    // з типом доставки/оплати — на відміну від AdvertController.buy (разова покупка одного оголошення).
    public class OrderController(IOrderService orderService) : ControllerBase
    {
        // Оформити замовлення: POST /api/order/create — потребує авторизації (роль User).
        [Authorize(Roles = Roles.User)]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] OrderCreationModel model)
        {
            var order = await orderService.CreateAsync(model);
            return Ok(order);
        }

        // Історія замовлень поточного користувача: GET /api/order/get/mine.
        [Authorize(Roles = Roles.User)]
        [HttpGet("get/mine")]
        public async Task<IActionResult> GetMine()
        {
            var orders = await orderService.GetUserOrdersAsync();
            return Ok(orders);
        }
    }
}
