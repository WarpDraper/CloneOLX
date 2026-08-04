using AutoMapper;
using Olx.BLL.DTOs.OrderDtos;
using Olx.BLL.Entities;

namespace Olx.BLL.Mapper
{
    public class OrderProfile : Profile
    {
        public OrderProfile()
        {
            CreateMap<Order, OrderDto>();
            CreateMap<OrderItem, OrderItemDto>();
        }
    }
}
