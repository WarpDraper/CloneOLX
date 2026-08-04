import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";
import type { IAdvert } from "../types/advert/IAdvert";
import type { IAdvertPageRequest } from "../types/advert/IAdvertPageRequest";
import type { IPageResponse } from "../types/common/IPageResponse";

export const advertService = createApi({
    reducerPath: "advertService",
    baseQuery: createBaseQuery("Advert"), // префікс /api/Advert
    tagTypes: ["Advert"],
    endpoints: (builder) => ({

        // 1. ДЕТАЛІ ОГОЛОШЕННЯ: GET /api/advert/get/{id} — публічний ендпоінт.
        getAdvertById: builder.query<IAdvert, number>({
            query: (id) => `/get/${id}`,
            providesTags: (_result, _error, id) => [{ type: "Advert", id }],
        }),

        // 2. НАБІР ОГОЛОШЕНЬ ЗА ID: POST /api/advert/get/range — публічний, використовується
        // для сітки оголошень продавця (у зв'язці з ISellerProfile.adverts).
        getAdvertsByRange: builder.mutation<IAdvert[], number[]>({
            query: (ids) => ({
                url: "/get/range",
                method: "POST",
                body: ids,
            }),
        }),

        // 3. КУПИТИ ОГОЛОШЕННЯ: POST /api/advert/buy/{advertId} — потребує авторизації (роль User).
        buyAdvert: builder.mutation<void, number>({
            query: (advertId) => ({
                url: `/buy/${advertId}`,
                method: "POST",
            }),
        }),

        // 4. СТОРІНКА ОГОЛОШЕНЬ (пошук/фільтри/рекомендації): POST /api/advert/get/page — публічний.
        getAdvertsPage: builder.query<IPageResponse<IAdvert>, IAdvertPageRequest>({
            query: (pageRequest) => ({
                url: "/get/page",
                method: "POST",
                body: pageRequest,
            }),
            providesTags: ["Advert"],
        }),

        // 5. СТВОРИТИ ОГОЛОШЕННЯ (Frame 331): PUT /api/advert/create, multipart/form-data
        // (AdvertCreationModel: Title/Description/Price/CategoryId/SettlementRef/ImageFiles/...).
        createAdvert: builder.mutation<IAdvert, FormData>({
            query: (formData) => ({
                url: "/create",
                method: "PUT",
                body: formData,
            }),
            invalidatesTags: ["Advert"],
        }),

    }),
});

export const {
    useGetAdvertByIdQuery,
    useGetAdvertsByRangeMutation,
    useBuyAdvertMutation,
    useGetAdvertsPageQuery,
    useCreateAdvertMutation,
} = advertService;
