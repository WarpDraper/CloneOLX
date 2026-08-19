import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";
import type { IRegisterUser } from "../types/account/IRegisterUser";
import type { IUserLogin } from "../types/account/IUserLogin.ts";
import type { ILoginResult } from "../types/account/ILoginResult.ts";
import type { IAdvert } from "../types/advert/IAdvert";
import type { IUserEditResponse } from "../types/account/IUserEditResponse";
import type { ITelegramAuthData } from "../types/account/ITelegramAuthData";
import type { IMyProfile } from "../types/user/IMyProfile";

export const accountService = createApi({
    reducerPath: "accountService",
    baseQuery: createBaseQuery("Account"), // Автоматично робить префікс /api/Account
    tagTypes: ["Favorites", "MyProfile"],
    endpoints: (builder) => ({

        // 1. РЕЄСТРАЦІЯ: тепер без примусового JSON-заголовка! Бекенд одразу автентифікує
        // нового користувача й повертає ту саму форму відповіді, що й /login (accessToken у
        // тілі, refreshToken — у HttpOnly cookie), тож тип відповіді співпадає з ILoginResult.
        register: builder.mutation<ILoginResult, IRegisterUser>({
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

        // 2c. ТЕЛЕГРАМ-ЛОГІН: POST /login/telegram, приймає payload Telegram Login Widget
        // (id/first_name/username/auth_date/hash) — HMAC-перевірка відбувається на бекенді.
        telegramLogin: builder.mutation<ILoginResult, ITelegramAuthData>({
            query: (body) => ({
                url: "/telegram-login",
                method: "POST",
                body,
                headers: { "Content-Type": "application/json" },
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

        // 11. НАЛАШТУВАННЯ РОЗСИЛКИ (Frame 336, "Підписка на новини"): POST /api/account/subscribe,
        // точно відповідає Olx.BLL.Models.User.NewsletterSubscriptionModel ({ Subscribed: bool }).
        // Приймає бажаний стан явно (не сліпе перемикання), тож повторний клік/ретрай ніколи не
        // розходиться із сервером — відповідь повертає збережене значення.
        setNewsletterSubscription: builder.mutation<{ subscribed: boolean }, boolean>({
            query: (subscribed) => ({
                url: "/subscribe",
                method: "POST",
                body: { Subscribed: subscribed },
            }),
        }),

        // 12. ВЛАСНИЙ ПРОФІЛЬ (гаманець): GET /api/account/profile — авторизований, id береться з
        // JWT на бекенді (не з route/query), тож на відміну від /api/user/get/{id} тут безпечно
        // повертати чутливі власні поля (наразі — Balance).
        getMyProfile: builder.query<IMyProfile, void>({
            query: () => "/profile",
            providesTags: ["MyProfile"],
        }),

        // 13. ПОПОВНЕННЯ ГАМАНЦЯ: POST /api/account/wallet/topup, точно відповідає
        // Olx.BLL.Models.User.WalletTopUpModel ({ Amount: decimal }). Це мок-оплата (немає
        // реального платіжного шлюзу) — бекенд одразу зараховує суму на Balance.
        topUpWallet: builder.mutation<{ balance: number }, number>({
            query: (amount) => ({
                url: "/wallet/topup",
                method: "POST",
                body: { Amount: amount },
            }),
            invalidatesTags: ["MyProfile"],
        }),

    }),
});

export const {
    useRegisterMutation,
    useLoginMutation,
    useGoogleLoginMutation,
    useTelegramLoginMutation,
    useForgotPasswordMutation,
    useResetPasswordMutation,
    useSendVerificationCodeMutation,
    useVerifyEmailCodeMutation,
    useGetFavoritesQuery,
    useAddToFavoritesMutation,
    useRemoveFromFavoritesMutation,
    useEditUserMutation,
    useSetNewsletterSubscriptionMutation,
    useGetMyProfileQuery,
    useTopUpWalletMutation,
} = accountService;