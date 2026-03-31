import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ 
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['User', 'Ad', 'Category', 'Report', 'Notification'],
  endpoints: (builder) => ({
    // Auth Endpoints
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    
    // Ad Endpoints
    getCategories: builder.query({
      query: () => '/categories',
      providesTags: ['Category'],
    }),
    getAds: builder.query({
      query: (params) => ({
        url: '/ads',
        params,
      }),
      providesTags: ['Ad'],
    }),
    getUserAds: builder.query({
      query: () => '/users/me/ads',
      providesTags: ['Ad'],
    }),
    
    // Admin Endpoints
    getUsers: builder.query({
      query: () => '/admin/users',
      providesTags: ['User'],
    }),
    toggleUserBlock: builder.mutation({
      query: (id) => ({
        url: `/admin/users/${id}/toggle-block`,
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),
    getReports: builder.query({
      query: () => '/admin/reports',
      providesTags: ['Report'],
    }),
    updateReportStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/admin/reports/${id}/status`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: ['Report'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetCategoriesQuery,
  useGetAdsQuery,
  useGetUserAdsQuery,
  useGetUsersQuery,
  useToggleUserBlockMutation,
  useGetReportsQuery,
  useUpdateReportStatusMutation,
} = api;
