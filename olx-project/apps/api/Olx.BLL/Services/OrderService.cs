using AutoMapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Olx.BLL.DTOs.OrderDtos;
using Olx.BLL.Entities;
using Olx.BLL.Exceptions;
using Olx.BLL.Exstensions;
using Olx.BLL.Interfaces;
using Olx.BLL.Models.Order;
using Olx.BLL.Resources;
using System.Net;

namespace Olx.BLL.Services
{
    // Оформлення замовлення: створює один запис Order + OrderItem на позицію кошика (кілька
    // оголошень за раз), знімаючи Title/Price оголошення на момент покупки, і позначає куплені
    // оголошення завершеними — так само як AdvertService.BuyAsync, але для кошика з кількома
    // позиціями за один чекаут, а не разової покупки одного оголошення.
    public class OrderService(
        IRepository<Order> orderRepository,
        IRepository<Advert> advertRepository,
        UserManager<OlxUser> userManager,
        IHttpContextAccessor httpContext,
        IMapper mapper) : IOrderService
    {
        public async Task<OrderDto> CreateAsync(OrderCreationModel model)
        {
            var user = await userManager.UpdateUserActivityAsync(httpContext);

            if (model.Items == null || model.Items.Count == 0)
                throw new HttpException("Order must contain at least one item.", HttpStatusCode.BadRequest);

            var order = new Order
            {
                UserId = user.Id,
                Date = DateTime.UtcNow,
                DeliveryType = model.DeliveryType,
                PaymentMethod = model.PaymentMethod,
                SettlementRef = model.SettlementRef,
                SettlementDescription = model.SettlementDescription,
                WarehouseRef = model.WarehouseRef,
                WarehouseDescription = model.WarehouseDescription,
                Address = model.Address,
                RecipientName = model.RecipientName,
                RecipientPhone = model.RecipientPhone,
                Items = new List<OrderItem>(),
            };

            decimal total = 0;
            foreach (var itemModel in model.Items)
            {
                var advert = await advertRepository.GetByIDAsync(itemModel.AdvertId)
                    ?? throw new HttpException(Errors.InvalidAdvertId, HttpStatusCode.BadRequest);

                var quantity = Math.Max(1, itemModel.Quantity);
                total += advert.Price * quantity;

                order.Items.Add(new OrderItem
                {
                    AdvertId = advert.Id,
                    Title = advert.Title,
                    Price = advert.Price,
                    Quantity = quantity,
                });

                advert.Completed = true;
            }
            order.TotalPrice = total;

            await orderRepository.AddAsync(order);
            // Один SaveChanges на спільному DbContext персистить і новий Order/OrderItem-и,
            // і зміни advert.Completed вище (advertRepository/orderRepository — той самий context).
            await orderRepository.SaveAsync();

            return mapper.Map<OrderDto>(order);
        }

        public async Task<IEnumerable<OrderDto>> GetUserOrdersAsync()
        {
            var user = await userManager.UpdateUserActivityAsync(httpContext);
            var orders = await orderRepository.GetQuery()
                .Include(x => x.Items)
                .Where(x => x.UserId == user.Id)
                .OrderByDescending(x => x.Date)
                .ToListAsync();

            return mapper.Map<IEnumerable<OrderDto>>(orders);
        }
    }
}
