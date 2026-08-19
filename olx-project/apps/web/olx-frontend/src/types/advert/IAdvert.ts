import type { IAdvertImage } from "./IAdvertImage";
import type { IFilterValue } from "./IFilterValue";
import type { ISellerShort } from "../user/ISellerShort";

// Дзеркалить Olx.BLL.Entities.ItemCondition (за числовим значенням enum-а, як його серіалізує
// ASP.NET Core за замовчуванням — той самий підхід, що й DeliveryType/PaymentMethod в IOrder.ts).
export const ItemCondition = {
    None: 0,
    Used: 1,
    New: 2,
} as const;

export type ItemCondition = (typeof ItemCondition)[keyof typeof ItemCondition];

// Дзеркалить Olx.BLL.DTOs.AdvertDtos.AdvertDto (GET /api/advert/get/{id})
export interface IAdvert {
    id: number;
    userId: number;
    user: ISellerShort | null;
    phoneNumber: string;
    contactEmail: string;
    contactPersone: string;
    date: string;
    title: string;
    description: string;
    isContractPrice: boolean;
    price: number;
    categoryId: number;
    categoryName: string;
    approved: boolean;
    blocked: boolean;
    completed: boolean;
    condition: ItemCondition;
    settlementName: string;
    settlementRef: string;
    regionRef: string;
    areaRef: string;
    // Premium/"ТОП" placement flag — golden crown badge + guaranteed feed placement (see
    // utils/arrangeFeedWithTopAds.ts). Computed on the backend (Id % 5 == 0, AdvertProfile), not
    // a real persisted column.
    isTop: boolean;
    // Favorited-by count — backs the "За популярністю" sort option.
    favoritesCount: number;
    // Fast, Redis-backed hit counter (see IAdvertViewCounterService on the backend) — not a
    // persisted DB column. Only ever set on the GetByIdAsync (detail page) response; every other
    // AdvertDto-returning endpoint leaves this at 0.
    viewCount: number;
    filterValues: IFilterValue[];
    images: IAdvertImage[];
}
