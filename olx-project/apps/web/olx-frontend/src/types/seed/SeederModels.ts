// Raw shapes of the backend seed fixtures (apps/api/OLX.API/Helpers/JsonData/*.json,
// mirrored to src/data/seed/*.seed.json). See OLX.API.Models.Seeder.* and DbSeeder.cs.

export interface SeederCategoryModel {
    name: string;
    image?: string;
    filters?: string[];
    childs?: SeederCategoryModel[];
}

export interface SeederAdvertModel {
    UserId: number;
    PhoneNumber: string;
    ContactEmail: string;
    ContactPersone: string;
    Title: string;
    Description: string;
    IsContractPrice: boolean;
    Price: number;
    CategoryId: number;
    FilterValueIds: number[];
    ImagePaths: string[];
    SettlementRef: string;
    // --- Frontend-only hydration hints (not present in the backend's Adverts.json) ---
    // Backend CategoryId/FilterValueIds are real DB auto-increment ids that can never be
    // reproduced client-side (see getSeedAdverts()). CategoryName/FilterSelections let the
    // seed-fallback hydration resolve the *correct* synthetic category/filter-value ids from
    // categories.seed.json / filters.seed.json by name instead, so category filtering and
    // facet filtering work correctly when running against local seed data.
    CategoryName?: string;
    FilterSelections?: Record<string, string[]>;
}

// Password and imageBase64 are intentionally NOT part of this type — they're stripped
// from users.seed.json before it ever reaches the frontend bundle (see that file).
export interface SeederUserModel {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    phoneNumber: string;
}

export interface SeederFilterModel {
    name: string;
    values: string[];
}
