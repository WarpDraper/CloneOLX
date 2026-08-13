using Olx.BLL.Entities;

namespace Olx.BLL.Models.Order
{
    // POST /api/order/create request body.
    public class OrderCreationModel
    {
        public DeliveryType DeliveryType { get; init; }
        public PaymentMethod PaymentMethod { get; init; }

        // Заповнюються лише для DeliveryType.OlxDelivery.
        public string? SettlementRef { get; init; }
        public string? SettlementDescription { get; init; }
        public string? WarehouseRef { get; init; }
        public string? WarehouseDescription { get; init; }

        // Заповнюється лише для DeliveryType.Courier.
        public string? Address { get; init; }

        public string RecipientName { get; init; } = string.Empty;
        public string RecipientPhone { get; init; } = string.Empty;

        public ICollection<OrderItemCreationModel> Items { get; init; } = new List<OrderItemCreationModel>();
    }
}
