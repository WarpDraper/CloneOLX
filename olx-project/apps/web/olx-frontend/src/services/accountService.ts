import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";
import type { IUserItem } from "../types/account/IUserItem";
import type { IRegisterUser } from "../types/account/IRegisterUser";
import type { IUserLogin } from "../types/account/IUserLogin.ts";
import type { ILoginResult } from "../types/account/ILoginResult.ts";
import type { IAdvert } from "../types/advert/IAdvert";
import type { IUserEditResponse } from "../types/account/IUserEditResponse";

export const accountService = createApi({
    reducerPath: "accountService",
    baseQuery: createBaseQuery("Account"), // Автоматично робить префікс /api/Account
    tagTypes: ["Favorites"],
    endpoints: (builder) => ({

        // 1. РЕЄСТРАЦІЯ: тепер без примусового JSON-заголовка!
        register: builder.mutation<IUserItem, IRegisterUser>({
            query: (body) => {
                return {
                    url: "/register/user",
                    method: "PUT",
                    body: body,
                    // ❌ ВИДАЛЕНО headers: { "Content-Type": "application/json" }
                    // Тепер браузер сам встановить multipart/form-data для FormData
                };
            },
        }),

        // 2. ЛОГІН: тут усе правильно (передаємо звичайний JSON-об'єкт)
        login: builder.mutation<ILoginResult, IUserLogin>({
            query: (body) => {
                return {
                    url: "/login",
                    method: "POST",
                    body: body,
                    headers: { "Content-Type": "application/json" },
                };
            },
        }),

        // 2b. ГУГЛ-ЛОГІН: POST /login/google?googleAccessToken=... — приймає OAuth2 access token
        // (не id_token/credential), отриманий через @react-oauth/google's implicit flow, і віддає
        // ті самі accessToken/refreshToken, що й звичайний /login.
        googleLogin: builder.mutation<ILoginResult, string>({
            query: (googleAccessToken) => ({
                url: "/login/google",
                method: "POST",
                params: { googleAccessToken },
            }),
        }),

        // 3. ЗАБУЛИ ПАРОЛЬ: POST /api/account/password/forgot, JSON body { email }.
        forgotPassword: builder.mutation<{ message: string }, { email: string }>({
            query: (body) => ({
                url: "/password/forgot",
                method: "POST",
                body,
            }),
        }),

        // 4. СКИДАННЯ ПАРОЛЯ: точна відповідність Olx.BLL.Models.ResetPasswordModel
        // (UserId/Token/Password) — userId/token приходять з посилання в листі
        // ("...?token=...&id=..."), не email.
        resetPassword: builder.mutation<{ message: string }, { userId: number; token: string; password: string }>({
            query: (body) => ({
                url: "/password/reset",
                method: "POST",
                body,
            }),
        }),

        // 5. НАДІСЛАТИ КОД ПІДТВЕРДЖЕННЯ EMAIL: POST /api/account/send-verification-code.
        sendVerificationCode: builder.mutation<void, void>({
            query: () => ({
                url: "/send-verification-code",
                method: "POST",
            }),
        }),

        // 6. ПЕРЕВІРИТИ КОД ПІДТВЕРДЖЕННЯ EMAIL: POST /api/account/verify-email-code.
        verifyEmailCode: builder.mutation<void, { code: string }>({
            query: (body) => ({
                url: "/verify-email-code",
                method: "POST",
                body,
            }),
        }),

        // 7. СПИСОК ОБРАНОГО: GET /api/account/favorites (потребує авторизації).
        getFavorites: builder.query<IAdvert[], void>({
            query: () => "/favorites",
            providesTags: ["Favorites"],
        }),

        // 8. ДОДАТИ ДО ОБРАНОГО: POST /api/account/favorites/add/{advertId}.
        addToFavorites: builder.mutation<void, number>({
            query: (advertId) => ({
                url: `/favorites/add/${advertId}`,
                method: "POST",
            }),
            invalidatesTags: ["Favorites"],
        }),

        // 9. ВИДАЛИТИ З ОБРАНОГО: DELETE /api/account/favorites/remove/{advertId}.
        removeFromFavorites: builder.mutation<void, number>({
            query: (advertId) => ({
                url: `/favorites/remove/${advertId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Favorites"],
        }),

        // 10. НАЛАШТУВАННЯ ПРОФІЛЮ (Frame 336): POST /api/account/edit/user, multipart/form-data,
        // точно відповідає UserEditModel (Id/FirstName/LastName/PhoneNumber/SettlementRef/ImageFile/...).
        // Повертає новий access token — застосовується через setAuth, а не updateUser.
        editUser: builder.mutation<IUserEditResponse, FormData>({
            query: (formData) => ({
                url: "/edit/user",
                method: "POST",
                body: formData,
            }),
        }),

    }),
});

export const {
    useRegisterMutation,
    useLoginMutation,
    useGoogleLoginMutation,
    useForgotPasswordMutation,
    useResetPasswordMutation,
    useSendVerificationCodeMutation,
    useVerifyEmailCodeMutation,
    useGetFavoritesQuery,
    useAddToFavoritesMutation,
    useRemoveFromFavoritesMutation,
    useEditUserMutation,
} = accountService;