import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";
import type { ISellerProfile } from "../types/user/ISellerProfile";

// Seed-hydrated sellers/adverts use synthetic negative ids (see utils/seedHydration.ts) — the
// backend can never resolve those (GET /api/User/get/-1747 -> 400 Bad Request), so every call
// site that turns a user/seller id into a profile request must treat id <= 0 (and NaN) as
// "not a real API id" and skip the request instead of firing it.
export const isRealUserId = (id: number | null | undefined): id is number =>
    typeof id === "number" && Number.isFinite(id) && id > 0;

export const profileService = createApi({
    reducerPath: "profileService",
    baseQuery: createBaseQuery("User"), // префікс /api/User
    endpoints: (builder) => ({

        // ПУБЛІЧНИЙ ПРОФІЛЬ ПРОДАВЦЯ: GET /api/user/get/{id} ([AllowAnonymous] на бекенді).
        getSellerProfile: builder.query<ISellerProfile, number>({
            query: (id) => `/get/${id}`,
        }),

    }),
});

export const { useGetSellerProfileQuery } = profileService;
