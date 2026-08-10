import { fetchBaseQuery } from "@reduxjs/toolkit/query/react"; // краще імпортувати з /react
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { APP_ENV } from "../env";
import type { RootState } from "../store";
import { addNotification } from "../store/notificationSlice";

// Shared base query for every *Service.ts RTK Query slice. Wraps fetchBaseQuery with
// request/response/error console logging (see debug logging spec): every request is
// logged in dev, every failed response (4xx/5xx/CORS/network) is logged via console.error
// with status + endpoint regardless of environment, so backend issues are visible in prod too.
//
// Backend-unreachable errors (ERR_CONNECTION_REFUSED, dev API down, CORS preflight failure)
// are additionally throttled to a SINGLE user-facing notification + console line per cooldown
// window instead of one per failed request — every *Service.ts slice shares this module-level
// state, so a page that fires a dozen queries against a dead backend surfaces one toast, not
// a dozen ("Бекенд не відповідає" spam).
const UNREACHABLE_NOTICE_COOLDOWN_MS = 30_000;
let lastUnreachableNoticeAt = 0;

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
            if (isBackendUnreachable(result.error)) {
                // Single throttled notification + console line for the whole app, not one per
                // failed request — see cooldown note above.
                const now = Date.now();
                if (now - lastUnreachableNoticeAt > UNREACHABLE_NOTICE_COOLDOWN_MS) {
                    lastUnreachableNoticeAt = now;
                    console.error(`[API ✕] Backend unreachable`, { endpoint, request: args, status: result.error.status });
                    api.dispatch(
                        addNotification({
                            type: "error",
                            title: "Немає з'єднання",
                            message: "Бекенд не відповідає",
                        })
                    );
                }
            } else {
                // Covers 4xx/5xx (result.error.status is a number) — genuine responses from a
                // reachable backend, logged individually as before.
                console.error(`[API ✕] ${endpoint}`, {
                    request: args,
                    status: result.error.status,
                    error: result.error.data ?? result.error,
                });
            }
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
