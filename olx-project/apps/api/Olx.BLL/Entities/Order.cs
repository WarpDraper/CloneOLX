using System.ComponentModel.DataAnnotations.Schema;

namespace Olx.BLL.Entities
{
    [Table("tbl_Orders")]
    // Оформлене замовлення (кошик з кількох оголошень за один чекаут) — на відміну від
    // AdvertService.BuyAsync (разова покупка одного оголошення, без збереження окремого запису).
    public class Order : BaseEntity
    {
        public int UserId { get; set; }
        public OlxUser User { get; set; } = null!;
        public DateTime Date { get; set; } = DateTime.UtcNow;
        public DeliveryType DeliveryType { get; set; }
        public PaymentMethod PaymentMethod { get; set; }

        // Заповнюються лише для DeliveryType.OlxDelivery (відділення Нової пошти/Укрпошти).
        public string? SettlementRef { get; set; }
        public string? SettlementDescription { get; set; }
        public string? WarehouseRef { get; set; }
        public string? WarehouseDescription { get; set; }

        // Заповнюється лише для DeliveryType.Courier.
        public string? Address { get; set; }

        public string RecipientName { get; set; } = string.Empty;
        public string RecipientPhone { get; set; } = string.Empty;
        public decimal TotalPrice { get; set; }

        public ICollection<OrderItem> Items { get; set; } = new HashSet<OrderItem>();
    }
}
