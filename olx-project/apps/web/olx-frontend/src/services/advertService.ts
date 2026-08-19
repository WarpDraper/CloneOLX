import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";
import type { IAdvert } from "../types/advert/IAdvert";
import type { IAdvertPageRequest } from "../types/advert/IAdvertPageRequest";
import type { IPageResponse } from "../types/common/IPageResponse";

// Warns (once per response, not once per card) when a page of adverts comes back from the
// backend with items that have no usable cover photo — either `images` is empty/missing, or
// every entry in it has a null/blank `name`. On its own this is silent in the UI (AdvertCard /
// RecommendationCard just render the "Немає фото" placeholder, which is also the correct
// behavior for adverts that genuinely have no photos), so without this log there's no signal to
// tell "some sellers didn't upload photos" apart from "the list/mapping endpoint stopped
// returning images for everyone" (see AdvertService.GetBalancedRandomPageAsync fix).
const warnAboutMissingImages = (items: IAdvert[]): void => {
    if (items.length === 0) return;
    const withoutImage = items.filter((item) => !item.images?.some((img) => !!img?.name));
    if (withoutImage.length === 0) return;
    console.warn(
        `[Advert ⚠] ${withoutImage.length}/${items.length} advert(s) in this page have no usable image`,
        { advertIds: withoutImage.map((item) => item.id) }
    );
};

/** True for a well-formed, positive backend advert id — guards call sites that turn a param
 *  into an advert/favorites/chat request against sending NaN/0/negative ids (backend rejects
 *  those with 400 Bad Request). Mirrors profileService.isRealUserId. */
export const isRealAdvertId = (id: number | null | undefined): id is number =>
    typeof id === "number" && Number.isFinite(id) && id > 0;

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
            transformResponse: (response: IPageResponse<IAdvert>) => {
                warnAboutMissingImages(response.items ?? []);
                return response;
            },
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
