using Olx.BLL.Entities;

namespace Olx.BLL.DTOs.OrderDtos
{
    // Дзеркалить Order (GET /api/order/get/mine, POST /api/order/create response).
    public class OrderDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public DateTime Date { get; set; }
        public DeliveryType DeliveryType { get; set; }
        public PaymentMethod PaymentMethod { get; set; }
        public string? SettlementRef { get; set; }
        public string? SettlementDescription { get; set; }
        public string? WarehouseRef { get; set; }
        public string? WarehouseDescription { get; set; }
        public string? Address { get; set; }
        public string RecipientName { get; set; } = string.Empty;
        public string RecipientPhone { get; set; } = string.Empty;
        public decimal TotalPrice { get; set; }
        public ICollection<OrderItemDto> Items { get; set; } = new List<OrderItemDto>();
    }
}
