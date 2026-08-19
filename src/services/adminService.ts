import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";
import { categoryService } from "./categoryService";
import type { ICategory } from "../types/category/ICategory";

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
    tagTypes: ['User', 'Report', 'Order', 'Product', 'Overview', 'Seller', 'NewsletterStats'],
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

        // PUT /api/admin/categories/{id} (multipart/form-data) — see AdminController.UpdateCategory
        // / CategoryService.EditAsync / CategoryCreationModelValidator on the backend.
        //
        // AutoMapper's CreateMap<CategoryCreationModel, Category>() maps every field unconditionally
        // (including nulls over existing values), so every field CategoryService reads must be
        // resent on every edit, not just the image — `category` below is the row exactly as loaded
        // from GET /api/category/get, used to repopulate everything except the image itself.
        //
        // Image semantics mirror CategoryService.EditAsync exactly:
        //   - imageFile provided        -> replace (old file deleted, new one saved)
        //   - no imageFile, removeImage -> clear (CurrentImage omitted/empty -> old file deleted, Image set null)
        //   - no imageFile, keep        -> CurrentImage = category.image -> left untouched
        updateCategoryImage: builder.mutation<
            ICategory,
            { id: number; category: ICategory; imageFile?: File | null; removeImage?: boolean }
        >({
            query: ({ id, category, imageFile, removeImage }) => {
                const formData = new FormData();
                formData.append("Id", String(id));
                formData.append("Name", category.name);
                if (category.nameUk) formData.append("NameUk", category.nameUk);
                if (category.nameEn) formData.append("NameEn", category.nameEn);
                if (category.slug) formData.append("Slug", category.slug);
                if (category.parentId != null) formData.append("ParentId", String(category.parentId));
                category.filters.forEach((filterId) => formData.append("FilterIds", String(filterId)));
                if (imageFile) {
                    formData.append("ImageFile", imageFile);
                } else if (!removeImage && category.image) {
                    formData.append("CurrentImage", category.image);
                }
                return { url: `/categories/${id}`, method: "PUT", body: formData };
            },
            // categoryService (GET /api/category/get, used by both the public storefront and this
            // same admin table) is a separate RTK Query api slice with its own cache — invalidating
            // its "Category" tag here is what makes the admin table (and MegaMenu/CategoryAvatar
            // everywhere else) pick up the new image without a full page reload.
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                try {
                    await queryFulfilled;
                    dispatch(categoryService.util.invalidateTags(["Category"]));
                } catch {
                    // Failure already logged + toasted by createBaseQuery.
                }
            },
        }),

        // GET /api/admin/newsletter/subscribers-count — see AdminController.GetNewsletterSubscribersCount.
        getNewsletterSubscribersCount: builder.query<{ count: number }, void>({
            query: () => ({
                url: "/newsletter/subscribers-count",
                method: "GET",
            }),
            providesTags: ['NewsletterStats'],
        }),

        // POST /api/admin/newsletter/send — see AdminController.SendNewsletter /
        // IAccountService.SendNewsletterAsync. Broadcasts to every OlxUser.NewsletterSubscribed.
        sendNewsletter: builder.mutation<{ sentCount: number }, { subject: string; body: string }>({
            query: (dto) => ({
                url: "/newsletter/send",
                method: "POST",
                body: dto,
            }),
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
    useUpdateCategoryImageMutation,
    useGetNewsletterSubscribersCountQuery,
    useSendNewsletterMutation,
} = adminService;