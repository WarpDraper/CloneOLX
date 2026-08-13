// Дзеркалить Olx.BLL.DTOs.OlxUserDtos.OlxUserDto — публічний профіль продавця (GET /api/user/get/{id})
export interface ISellerProfile {
    id: number;
    email: string;
    emailConfirmed: boolean;
    phoneNumberConfirmed: boolean;
    twoFactorEnabled: boolean;
    phoneNumber: string | null;
    firstName: string | null;
    lastName: string | null;
    photo: string | null;
    createdDate: string;
    lastActivity: string;
    webSite: string | null;
    about: string | null;
    settlementRef: string | null;
    settlementDescrption: string | null;
    rating: number;
    reviewsCount: number;
    accountType: "Individual" | "Business";
    adverts: number[];
    favoriteAdverts: number[];
    // Live SignalR presence (see MessageHub.OnConnectedAsync/OnDisconnectedAsync +
    // IConnectionTracker on the backend) — isOnline reflects the moment this response was
    // built; lastSeen is only meaningful while isOnline is false.
    isOnline: boolean;
    lastSeen: string;
}
