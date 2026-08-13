namespace Olx.BLL.DTOs.OrderDtos
{
    public class OrderItemDto
    {
        public int Id { get; set; }
        public int? AdvertId { get; set; }
        public string Title { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int Quantity { get; set; }
    }
}
