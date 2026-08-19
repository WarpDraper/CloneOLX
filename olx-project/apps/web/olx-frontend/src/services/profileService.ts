import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";
import type { ISellerProfile } from "../types/user/ISellerProfile";

// Every call site that turns a user/seller id into a profile request must treat id <= 0
// (and NaN) as "not a real API id" and skip the request instead of firing it (backend
// rejects e.g. GET /api/User/get/-1 or /get/0 with 404 Not Found).
//
// id === 1 is excluded too: it's the fallback value several call sites can transiently produce
// (e.g. Number(user?.id) before auth state has hydrated, or a stale/default param), and the
// backend rejects it with 404 Not Found the same way it rejects the synthetic seed ids —
// GET /api/User/get/1 is never a legitimate lookup from this frontend.
export const isRealUserId = (id: number | string | null | undefined): id is number =>
    (typeof id === "number" || typeof id === "string") &&
    Number.isFinite(Number(id)) &&
    Number(id) > 0 &&
    Number(id) !== 1;

// Same finite/positive check as isRealUserId, WITHOUT the id === 1 exclusion. That exclusion
// exists to keep route params / seed-derived ids from accidentally hitting the API as "id 1"
// fallbacks — it doesn't apply to the currently authenticated user's own id (decoded straight
// from the JWT's nameidentifier claim), which is a real database id and can legitimately be 1
// (e.g. the first seeded/admin account). Using isRealUserId for "my own profile" queries meant
// that account could never load its own Settings/Profile page — every request was skipped.
export const isOwnProfileId = (id: number | string | null | undefined): id is number =>
    (typeof id === "number" || typeof id === "string") &&
    Number.isFinite(Number(id)) &&
    Number(id) > 0;

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
