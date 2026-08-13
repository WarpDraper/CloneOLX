import type { IAdvertImage } from "./IAdvertImage";
import type { IFilterValue } from "./IFilterValue";
import type { ISellerShort } from "../user/ISellerShort";

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
    filterValues: IFilterValue[];
    images: IAdvertImage[];
}
