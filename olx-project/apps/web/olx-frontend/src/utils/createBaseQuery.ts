import { fetchBaseQuery } from "@reduxjs/toolkit/query/react"; // краще імпортувати з /react
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { APP_ENV } from "../env";
import type { RootState } from "../store";

// Shared base query for every *Service.ts RTK Query slice. Wraps fetchBaseQuery with
// request/response/error console logging (see debug logging spec): every request is
// logged in dev, every failed response (4xx/5xx/CORS/network) is logged via console.error
// with status + endpoint regardless of environment, so backend issues are visible in prod too.
export const createBaseQuery = (endpoint: string) => {
    const rawBaseQuery = fetchBaseQuery({
        baseUrl: `${APP_ENV.API_BASE_URL}/api/${endpoint}`,
        prepareHeaders: (headers, { getState }) => {
            const token = (getState() as RootState).auth.token;

            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }
            return headers;
        },
    });

    const loggingBaseQuery: typeof rawBaseQuery = async (args, api, extraOptions) => {
        if (import.meta.env.DEV) {
            console.log(`[API →] ${endpoint}`, args);
        }

        const result = await rawBaseQuery(args, api, extraOptions);

        if (result.error) {
            // Covers 4xx/5xx (result.error.status is a number) and network/CORS failures
            // (fetchBaseQuery reports those as status "FETCH_ERROR" / "TIMEOUT_ERROR").
            console.error(`[API ✕] ${endpoint}`, {
                request: args,
                status: result.error.status,
                error: result.error.data ?? result.error,
            });
        } else if (import.meta.env.DEV) {
            console.log(`[API ←] ${endpoint}`, result.data);
        }

        return result;
    };

    return loggingBaseQuery;
};

/**
 * True when a query failed because the backend is completely unreachable (dev API down,
 * ERR_CONNECTION_REFUSED, CORS preflight failure) rather than a genuine 4xx/5xx response.
 * *Service.ts callers use this (alongside an empty-result check) to decide when to fall back
 * to local seed data hydration (see utils/seedHydration.ts) instead of showing an error state.
 */
export const isBackendUnreachable = (error: FetchBaseQueryError | undefined): boolean =>
    !!error && (error.status === "FETCH_ERROR" || error.status === "TIMEOUT_ERROR");
