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
    filterValues: IFilterValue[];
    images: IAdvertImage[];
}
