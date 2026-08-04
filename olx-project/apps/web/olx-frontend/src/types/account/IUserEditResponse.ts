// Дзеркалить Olx.BLL.Models.Authentication.UserEditResponse — POST /api/account/edit/user
// повертає новий JWT з оновленими claim'ами (firstName/lastName/phoneNumber/avatarUrl/city).
export interface IUserEditResponse {
    accessToken: string;
}
