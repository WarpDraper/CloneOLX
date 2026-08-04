// Дзеркалить Olx.BLL.Entities.DeliveryType / PaymentMethod (за числовим значенням enum-а, як їх
// серіалізує ASP.NET Core за замовчуванням).
export enum DeliveryType {
    OlxDelivery = 1,
    SelfPickup = 2,
    Courier = 3,
}

export enum PaymentMethod {
    CardOnline = 1,
    CashOnDelivery = 2,
}

export interface IOrderItem {
    id: number;
    advertId: number | null;
    title: string;
    price: number;
    quantity: number;
}

// Дзеркалить Olx.BLL.DTOs.OrderDtos.OrderDto (POST /api/order/create response, GET /api/order/get/mine).
export interface IOrder {
    id: number;
    userId: number;
    date: string;
    deliveryType: DeliveryType;
    paymentMethod: PaymentMethod;
    settlementRef: string | null;
    settlementDescription: string | null;
    warehouseRef: string | null;
    warehouseDescription: string | null;
    address: string | null;
    recipientName: string;
    recipientPhone: string;
    totalPrice: number;
    items: IOrderItem[];
}
