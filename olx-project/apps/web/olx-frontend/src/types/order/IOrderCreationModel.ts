import type { DeliveryType, PaymentMethod } from "./IOrder";

export interface IOrderItemCreationModel {
    advertId: number;
    quantity: number;
}

// Дзеркалить Olx.BLL.Models.Order.OrderCreationModel (POST /api/order/create request body).
export interface IOrderCreationModel {
    deliveryType: DeliveryType;
    paymentMethod: PaymentMethod;
    settlementRef?: string;
    settlementDescription?: string;
    warehouseRef?: string;
    warehouseDescription?: string;
    address?: string;
    recipientName: string;
    recipientPhone: string;
    items: IOrderItemCreationModel[];
}
