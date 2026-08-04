using System.ComponentModel.DataAnnotations.Schema;

namespace Olx.BLL.Entities
{
    [Table("tbl_OrderItems")]
    // Позиція замовлення — знімок Title/Price оголошення на момент покупки, щоб замовлення
    // лишалось коректним навіть якщо саме оголошення пізніше видаляється (AdvertService.RemoveCompletedAsync).
    public class OrderItem : BaseEntity
    {
        public int OrderId { get; set; }
        public Order Order { get; set; }

        public int? AdvertId { get; set; }
        public Advert? Advert { get; set; }

        public string Title { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int Quantity { get; set; } = 1;
    }
}
