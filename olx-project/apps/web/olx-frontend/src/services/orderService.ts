import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";
import type { IOrder } from "../types/order/IOrder";
import type { IOrderCreationModel } from "../types/order/IOrderCreationModel";

export const orderService = createApi({
    reducerPath: "orderService",
    baseQuery: createBaseQuery("Order"), // префікс /api/Order
    tagTypes: ["Order"],
    endpoints: (builder) => ({

        // Оформити замовлення: POST /api/order/create — потребує авторизації.
        createOrder: builder.mutation<IOrder, IOrderCreationModel>({
            query: (model) => ({
                url: "/create",
                method: "POST",
                body: model,
            }),
            invalidatesTags: ["Order"],
        }),

        // Історія замовлень поточного користувача: GET /api/order/get/mine.
        getMyOrders: builder.query<IOrder[], void>({
            query: () => "/get/mine",
            providesTags: ["Order"],
        }),

    }),
});

export const { useCreateOrderMutation, useGetMyOrdersQuery } = orderService;
