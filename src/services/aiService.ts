import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";
import type { IGenerateAdvertResponse } from "../types/ai/IGenerateAdvertResponse";

export const aiService = createApi({
    reducerPath: "aiService",
    baseQuery: createBaseQuery("AI"), // префікс /api/AI
    endpoints: (builder) => ({

        // ✨ "Заповнити з AI": POST /api/AI/generate-advert — потребує авторизації (як і саме
        // створення оголошення). Приймає короткий заголовок, повертає пропоновану категорію
        // та згенерований опис (Google Gemini).
        generateAdvert: builder.mutation<IGenerateAdvertResponse, { title: string }>({
            query: (body) => ({
                url: "/generate-advert",
                method: "POST",
                body,
            }),
        }),

    }),
});

export const { useGenerateAdvertMutation } = aiService;
