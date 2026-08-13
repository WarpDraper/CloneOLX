import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";
import type { ISellerProfile } from "../types/user/ISellerProfile";

// Seed-hydrated sellers/adverts use synthetic negative ids (see utils/seedHydration.ts) — the
// backend can never resolve those (GET /api/User/get/-1747 -> 400 Bad Request), so every call
// site that turns a user/seller id into a profile request must treat id <= 0 (and NaN) as
// "not a real API id" and skip the request instead of firing it.
//
// id === 1 is excluded too: it's the fallback value several call sites can transiently produce
// (e.g. Number(user?.id) before auth state has hydrated, or a stale/default param), and the
// backend rejects it with 400 Bad Request the same way it rejects the synthetic seed ids —
// GET /api/User/get/1 is never a legitimate lookup from this frontend.
export const isRealUserId = (id: number | string | null | undefined): id is number =>
    (typeof id === "number" || typeof id === "string") &&
    Number.isFinite(Number(id)) &&
    Number(id) > 0 &&
    Number(id) !== 1;

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
