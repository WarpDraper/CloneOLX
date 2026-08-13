using Olx.BLL.DTOs.OrderDtos;
using Olx.BLL.Models.Order;

namespace Olx.BLL.Interfaces
{
    public interface IOrderService
    {
        Task<OrderDto> CreateAsync(OrderCreationModel model);
        Task<IEnumerable<OrderDto>> GetUserOrdersAsync();
    }
}
