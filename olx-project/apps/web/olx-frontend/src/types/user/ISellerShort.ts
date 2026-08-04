// Дзеркалить Olx.BLL.DTOs.OlxUserDtos.OlxUserShortDto — вбудовується в AdvertDto.User
export interface ISellerShort {
    id: number;
    email: string;
    phoneNumber: string | null;
    firstName: string | null;
    lastName: string | null;
    photo: string | null;
    lastActivity: string;
    createdDate: string;
    webSite: string | null;
    settlementDescrption: string | null;
    rating: number;
    reviewsCount: number;
}
