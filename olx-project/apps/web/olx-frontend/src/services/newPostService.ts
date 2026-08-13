import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "../utils/createBaseQuery";
import type { IArea } from "../types/location/IArea";
import type { IRegion } from "../types/location/IRegion";
import type { ISettlement } from "../types/location/ISettlement";
import type { IWarehouse } from "../types/location/IWarehouse";

export const newPostService = createApi({
    reducerPath: "newPostService",
    baseQuery: createBaseQuery("NewPost"), // префікс /api/NewPost
    endpoints: (builder) => ({

        // Список областей — публічний. GET /api/newpost/areas
        getAreas: builder.query<IArea[], void>({
            query: () => "/areas",
        }),

        // Райони обраної області. GET /api/newpost/areas/regions?areaRef=
        getRegionsByArea: builder.query<IRegion[], string>({
            query: (areaRef) => ({ url: "/areas/regions", params: { areaRef } }),
        }),

        // Населені пункти обраного району. GET /api/newpost/region/settlements?regionRef=
        getSettlementsByRegion: builder.query<ISettlement[], string>({
            query: (regionRef) => ({ url: "/region/settlements", params: { regionRef } }),
        }),

        // Один населений пункт за Ref — використовується для показу вже збереженого міста без повторного каскаду.
        getSettlementByRef: builder.query<ISettlement, string>({
            query: (settlementRef) => ({ url: "/settlements", params: { settlementRef } }),
        }),

        // Відділення Нової пошти/Укрпошти обраного населеного пункту — вибір відділення для
        // доставки "OLX Доставка" при оформленні замовлення. GET /api/newpost/settlements/warehouses?settlementRef=
        getWarehousesBySettlement: builder.query<IWarehouse[], string>({
            query: (settlementRef) => ({ url: "/settlements/warehouses", params: { settlementRef } }),
        }),

    }),
});

export const {
    useGetAreasQuery,
    useGetRegionsByAreaQuery,
    useGetSettlementsByRegionQuery,
    useGetSettlementByRefQuery,
    useGetWarehousesBySettlementQuery,
} = newPostService;
