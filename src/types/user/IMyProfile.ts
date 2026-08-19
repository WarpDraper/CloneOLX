import type { ISellerProfile } from "./ISellerProfile";

// Дзеркалить Olx.BLL.DTOs.OlxUserDtos.MyProfileDto (GET /api/account/profile) — own-profile-only
// superset of ISellerProfile. Balance must NEVER be added to ISellerProfile itself: that DTO also
// backs the public/anonymous GET /api/user/get/{id} seller-profile lookup (see MyProfileDto.cs).
export interface IMyProfile extends ISellerProfile {
    balance: number;
}
