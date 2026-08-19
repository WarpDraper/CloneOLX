// Mirrors Olx.BLL.Models.Authentication.TelegramAuthModel (POST /api/account/telegram-login).
// Field names are snake_case to match the Telegram Login Widget callback payload exactly —
// see https://core.telegram.org/widgets/login — and are sent through to the backend as-is.
export interface ITelegramAuthData {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}
