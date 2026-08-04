import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";
import type { IFilter } from "../types/filter/IFilter";

export const filterService = createApi({
    reducerPath: "filterService",
    baseQuery: createBaseQuery("Filter"), // префікс /api/Filter
    endpoints: (builder) => ({

        // Назви характеристик для таблиці "Характеристика та опис" на сторінці оголошення.
        // POST /api/filter/get/range — публічний.
        getFiltersByRange: builder.mutation<IFilter[], number[]>({
            query: (ids) => ({
                url: "/get/range",
                method: "POST",
                body: ids,
            }),
        }),

    }),
});

export const { useGetFiltersByRangeMutation } = filterService;
