import type { IPageRequest } from "../common/IPageRequest";

// Дзеркалить Olx.BLL.Models.Advert.AdvertPageRequest (POST /api/advert/get/page)
export interface IAdvertPageRequest extends IPageRequest {
    priceFrom?: number;
    priceTo?: number;
    search?: string;
    categorySearch?: string;
    phoneSearch?: string;
    emailSearch?: string;
    settlementSearch?: string;
    settlementRef?: string;
    regionRef?: string;
    areaRef?: string;
    isContractPrice?: boolean;
    approved?: boolean;
    blocked?: boolean;
    archived?: boolean;
    categoryIds?: number[];
    filters?: number[][];
}
