import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";
import type { ICategory } from "../types/category/ICategory";

export const categoryService = createApi({
    reducerPath: "categoryService",
    baseQuery: createBaseQuery("Category"), // префікс /api/Category
    tagTypes: ["Category"],
    endpoints: (builder) => ({

        // Плаский список усіх категорій — публічний. GET /api/category/get
        getCategories: builder.query<ICategory[], void>({
            query: () => "/get",
            providesTags: ["Category"],
        }),

        // Одна категорія за ідентифікатором. GET /api/category/get/{id}
        getCategoryById: builder.query<ICategory, number>({
            query: (id) => `/get/${id}`,
            providesTags: (_result, _error, id) => [{ type: "Category", id }],
        }),

        // Повне дерево категорій (з дочірніми). GET /api/category/get/tree
        getCategoryTree: builder.query<ICategory[], void>({
            query: () => "/get/tree",
            providesTags: ["Category"],
        }),

        // Піддерево категорій за ідентифікатором кореня. GET /api/category/get/tree/{id}
        getCategoryTreeById: builder.query<ICategory, number>({
            query: (id) => `/get/tree/${id}`,
            providesTags: (_result, _error, id) => [{ type: "Category", id }],
        }),

    }),
});

export const {
    useGetCategoriesQuery,
    useGetCategoryByIdQuery,
    useGetCategoryTreeQuery,
    useGetCategoryTreeByIdQuery,
} = categoryService;
