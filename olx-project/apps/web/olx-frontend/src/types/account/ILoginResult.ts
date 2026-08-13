// Mirrors Olx.BLL.Models.Authentication.AuthResponse (returned by POST /login and
// POST /login/google) — previously declared `token`/`email` fields that didn't exist on the
// real API response (the backend returns `accessToken`/`refreshToken`), so this type was
// silently useless everywhere it was used as a generic type param.
export interface ILoginResult {
    accessToken: string;
    refreshToken: string | null;
}
