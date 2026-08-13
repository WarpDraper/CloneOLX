import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";

// Shapes returned by OLX.API.Controllers.AdminController — kept local to this slice since
// they're admin-dashboard-specific projections, not the general-purpose account/advert DTOs.
export interface IAdminUserItem {
    id: number;
    name: string;
    email: string;
    status: "active" | "blocked";
    registerDate: string;
}

export interface IAdminOrderItem {
    id: number;
    customerName: string;
    productName: string;
    price: number;
    status: "paid" | "processing" | "shipped" | "cancelled";
    date: string;
}

export interface IAdminProductItem {
    id: number;
    title: string;
    category: string;
    price: number;
    status: "active" | "sold" | "pending" | "blocked";
    salesCount: number;
}

export interface IAdminMetric {
    value: number;
    trend: number;
}

export interface IAdminChartPoint {
    label: string;
    value: number;
}

export interface IAdminStatusBreakdown {
    status: string;
    label: string;
    count: number;
    percent: number;
}

export interface IAdminSellerItem {
    id: number;
    name: string;
    email: string;
    productsCount: number;
    salesCount: number;
    rating: number;
}

export interface IAdminOverview {
    metrics: {
        totalSold: IAdminMetric;
        orders: IAdminMetric;
        users: IAdminMetric;
        sellers: IAdminMetric;
    };
    salesDynamics: IAdminChartPoint[];
    orderStatusBreakdown: IAdminStatusBreakdown[];
    recentOrders: IAdminOrderItem[];
    popularProducts: Array<{ id: number; title: string; price: number; salesCount: number; favoritesCount: number }>;
}

export const adminService = createApi({
    reducerPath: "adminService",
    baseQuery: createBaseQuery("Admin"),
    tagTypes: ['User', 'Report', 'Order', 'Product', 'Overview', 'Seller'],
    endpoints: (builder) => ({
        getUsers: builder.query<IAdminUserItem[], void>({
            query: () => ({
                url: "/users",
                method: "GET",
            }),
            providesTags: ['User'],
        }),

        toggleUserBlock: builder.mutation<void, number | string>({
            query: (id) => ({
                url: `/users/${id}/toggle-block`,
                method: 'POST',
            }),
            invalidatesTags: ['User'],
        }),

        getOrders: builder.query<IAdminOrderItem[], void>({
            query: () => ({
                url: "/orders",
                method: "GET",
            }),
            providesTags: ['Order'],
        }),

        getProducts: builder.query<IAdminProductItem[], void>({
            query: () => ({
                url: "/products",
                method: "GET",
            }),
            providesTags: ['Product'],
        }),

        getDashboardOverview: builder.query<IAdminOverview, { period: "week" | "month" | "year" }>({
            query: ({ period }) => ({
                url: `/dashboard/overview?period=${period}`,
                method: "GET",
            }),
            providesTags: ['Overview'],
        }),

        getSellers: builder.query<IAdminSellerItem[], void>({
            query: () => ({
                url: "/sellers",
                method: "GET",
            }),
            providesTags: ['Seller'],
        }),

    }),
});

export const {
    useGetUsersQuery,
    useToggleUserBlockMutation,
    useGetOrdersQuery,
    useGetProductsQuery,
    useGetDashboardOverviewQuery,
    useGetSellersQuery,
} = adminService;