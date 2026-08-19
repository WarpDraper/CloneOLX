import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";

interface IQrCodeUrlResponse {
    url: string;
}

// Публічні, нечутливі налаштування застосунку. Наразі лише цільове посилання для QR-коду
// (футер + головна сторінка) — керується через appsettings.json:QrCodeTargetUrl на бекенді,
// без хардкоду чи перезбірки фронтенду.
export const settingsService = createApi({
    reducerPath: "settingsService",
    baseQuery: createBaseQuery("Settings"), // префікс /api/Settings
    endpoints: (builder) => ({

        // GET /api/settings/qr-code-url — публічний, анонімний.
        getQrCodeUrl: builder.query<IQrCodeUrlResponse, void>({
            query: () => "/qr-code-url",
        }),

    }),
});

export const { useGetQrCodeUrlQuery } = settingsService;
