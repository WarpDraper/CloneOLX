namespace Olx.BLL.Entities
{
    // Спосіб доставки замовлення.
    public enum DeliveryType
    {
        OlxDelivery = 1,   // Відділення Нової пошти / Укрпошти (SettlementRef + WarehouseRef)
        SelfPickup = 2,    // Самовивіз з магазину продавця
        Courier = 3        // Кур'єрська доставка за адресою (Address)
    }

    // Спосіб оплати замовлення.
    public enum PaymentMethod
    {
        CardOnline = 1,        // Оплата карткою онлайн
        CashOnDelivery = 2     // Оплата при отриманні (накладений платіж)
    }
}
