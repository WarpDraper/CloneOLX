import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";
import type { ISellerProfile } from "../types/user/ISellerProfile";

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
