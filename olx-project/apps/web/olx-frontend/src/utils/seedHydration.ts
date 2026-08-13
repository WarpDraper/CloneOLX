import categoriesSeed from "../data/seed/categories.seed.json";
import advertsSeed from "../data/seed/adverts.seed.json";
import usersSeed from "../data/seed/users.seed.json";
import filtersSeed from "../data/seed/filters.seed.json";
import type { ICategory } from "../types/category/ICategory";
import type { IAdvert } from "../types/advert/IAdvert";
import type { ISellerShort } from "../types/user/ISellerShort";
import type { IFilter } from "../types/filter/IFilter";
import type { SeederAdvertModel, SeederCategoryModel, SeederFilterModel, SeederUserModel } from "../types/seed/SeederModels";
import { SEED_SETTLEMENT_REF_TO_CITY } from "../data/ukrainianCities";

/**
 * Local hydration from the backend's seed fixtures (apps/api/OLX.API/Helpers/JsonData/,
 * mirrored into src/data/seed/). This is a DISPLAY FALLBACK ONLY — used when the real
 * API (categoryService / advertService) has no data yet (e.g. backend offline in local
 * dev, or a fresh DB before DbSeeder has run). It never overrides live API data and
 * does not touch RTK Query.
 *
 * IDs are synthetic (negative) so they can never collide with real DB ids.
 */

let nextSyntheticId = -1;
const nextId = () => nextSyntheticId--;

const flattenCategories = (
    models: SeederCategoryModel[],
    parentId: number | null = null,
    parentName: string | null = null,
): ICategory[] =>
    models.flatMap((model) => {
        const id = nextId();
        const childs = flattenCategories(model.childs ?? [], id, model.name);
        const self: ICategory = {
            id,
            name: model.name,
            image: model.image || null,
            parentId,
            parentName,
            filters: [],
            filterNames: model.filters ?? [],
            childs,
        };
        return [self, ...childs];
    });

let cachedCategories: ICategory[] | null = null;
let cachedAdverts: IAdvert[] | null = null;
let cachedSellers: ISellerShort[] | null = null;
let cachedFilters: IFilter[] | null = null;

/** Full flattened category list (all levels), hydrated once from categories.seed.json. */
export const getSeedCategories = (): ICategory[] => {
    if (!cachedCategories) {
        cachedCategories = flattenCategories(categoriesSeed as SeederCategoryModel[]);
    }
    return cachedCategories;
};

/** Top-level categories only — matches what UserHomePage/CategoriesPage render. */
export const getSeedTopLevelCategories = (): ICategory[] =>
    getSeedCategories().filter((c) => c.parentId === null);

/** Find a hydrated seed category by its (synthetic) id. */
export const findSeedCategoryById = (categoryId: number): ICategory | undefined =>
    getSeedCategories().find((c) => c.id === categoryId);

/** Product listings hydrated once from adverts.seed.json (Home Page / category pages). */
export const getSeedAdverts = (): IAdvert[] => {
    if (cachedAdverts) return cachedAdverts;

    const categories = getSeedCategories();
    const nameById = new Map(categories.map((c) => [c.id, c.name]));
    const categoryByName = new Map(categories.map((c) => [c.name, c]));
    const filters = getSeedFilters();
    const filterByName = new Map(filters.map((f) => [f.name, f]));

    cachedAdverts = (advertsSeed as unknown as SeederAdvertModel[]).map((model, index) => {
        const advertId = nextId();
        // Stagger synthetic "posted" dates (first entry = newest) so the "За новизною" sort
        // has something meaningful to sort by in seed-fallback mode.
        const date = new Date(Date.now() - index * 60 * 60 * 1000).toISOString();

        // Prefer resolving the category by name (CategoryName) against the seed-hydrated
        // tree — this yields a synthetic id that actually matches getSeedCategories(), unlike
        // the raw backend CategoryId (a real DB id we can't reproduce client-side). Falls back
        // to the raw numeric CategoryId for backward compatibility if no name is given/found.
        const resolvedCategory = model.CategoryName ? categoryByName.get(model.CategoryName) : undefined;
        const categoryId = resolvedCategory ? resolvedCategory.id : model.CategoryId;
        const categoryName = resolvedCategory ? resolvedCategory.name : nameById.get(model.CategoryId) ?? "";

        // Resolve declared {filterName: [values]} selections into real synthetic
        // IFilterValue objects so client-side facet filtering (CategoryListingPage) works
        // against seed-fallback data the same way it would against real API data.
        const filterValues = Object.entries(model.FilterSelections ?? {}).flatMap(([filterName, values]) => {
            const filter = filterByName.get(filterName);
            if (!filter) return [];
            return values
                .map((value) => filter.values?.find((v) => v.value === value))
                .filter((v): v is NonNullable<typeof v> => !!v);
        });

        return {
            id: advertId,
            userId: model.UserId,
            user: null,
            phoneNumber: model.PhoneNumber,
            contactEmail: model.ContactEmail,
            contactPersone: model.ContactPersone,
            date,
            title: model.Title,
            description: model.Description,
            isContractPrice: model.IsContractPrice,
            price: model.Price,
            categoryId,
            categoryName,
            approved: true,
            blocked: false,
            completed: false,
            settlementName: SEED_SETTLEMENT_REF_TO_CITY[model.SettlementRef] ?? "",
            settlementRef: model.SettlementRef,
            regionRef: "",
            areaRef: "",
            // Mirrors the backend's deterministic `Id % 5 == 0` placement (AdvertProfile) using
            // the synthetic (negative, decreasing) id assigned above — same ~1-in-5 spread in
            // offline/seed-fallback mode as against the real API.
            isTop: Math.abs(advertId) % 5 === 0,
            // No real favorites in offline mode — a stable per-advert pseudo-score (from the
            // synthetic id) still gives the "За популярності" seed-fallback sort something
            // meaningful and consistent to order by, instead of every item tying at 0.
            favoritesCount: Math.abs(advertId) % 47,
            filterValues,
            images: model.ImagePaths.map((path, imgIndex) => ({
                id: nextId(),
                name: path,
                advertId,
                priority: imgIndex,
            })),
        };
    });

    return cachedAdverts;
};

/**
 * Category-balanced random sample of `count` adverts from getSeedAdverts() — mirrors the
 * backend's GetBalancedRandomPageAsync (sortKey: 'random') round-robin-across-categories logic,
 * so the offline/seed-fallback recommendation rail doesn't just show the first N entries in
 * adverts.seed.json (which are grouped by category, e.g. 12 cars in a row) when the API is
 * unreachable. Re-shuffled on every call — no caching — so a page refresh varies the mix.
 */
export const getSeedRecommendedAdverts = (count: number): IAdvert[] => {
    const shuffle = <T,>(arr: T[]): T[] => {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };

    const byCategory = new Map<number, IAdvert[]>();
    shuffle(getSeedAdverts()).forEach((advert) => {
        const bucket = byCategory.get(advert.categoryId);
        if (bucket) bucket.push(advert);
        else byCategory.set(advert.categoryId, [advert]);
    });
    const queues = shuffle([...byCategory.values()]);

    const result: IAdvert[] = [];
    let remaining = queues.some((q) => q.length > 0);
    while (result.length < count && remaining) {
        remaining = false;
        for (const queue of queues) {
            if (queue.length === 0) continue;
            result.push(queue.shift()!);
            if (queue.length > 0) remaining = true;
            if (result.length >= count) break;
        }
    }
    return result;
};

/**
 * Filter catalogue hydrated once from filters.seed.json — every named filter group the
 * backend can seed (condition, brand, size, etc.), each with its full value list. Used as a
 * fallback for the CategoryListingPage sidebar when getFiltersByRange returns empty/errors,
 * matched against a category's `filterNames` (which is populated for both real-API and
 * seed-hydrated categories alike).
 */
export const getSeedFilters = (): IFilter[] => {
    if (!cachedFilters) {
        cachedFilters = (filtersSeed as SeederFilterModel[]).map((model) => {
            const filterId = nextId();
            return {
                id: filterId,
                name: model.name,
                values: model.values.map((value) => ({
                    id: nextId(),
                    filterId,
                    value,
                })),
            };
        });
    }
    return cachedFilters;
};

/** Subset of getSeedFilters() matching the given names (e.g. a category's `filterNames`). */
export const getSeedFiltersByNames = (names: string[]): IFilter[] => {
    if (names.length === 0) return [];
    const wanted = new Set(names);
    return getSeedFilters().filter((f) => wanted.has(f.name));
};

const escapeRegExp = (raw: string): string => raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * True when `word` appears in `text` as a standalone token, not as a substring of a longer
 * word — e.g. "авто" must match "Авто продам" but NOT "автономне опалення" or "автоматична
 * коробка". Plain JS `\b` only recognises ASCII word characters, so it doesn't work for
 * Cyrillic text; this uses Unicode property escapes (`\p{L}`/`\p{N}`) instead.
 */
const containsWord = (text: string, word: string): boolean => {
    if (!word) return false;
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(word)}(?![\\p{L}\\p{N}])`, "iu");
    return pattern.test(text);
};

/**
 * True when every whitespace-separated token of `query` appears as a standalone word
 * somewhere in `text` (all tokens required, order-independent). Used for both the seed
 * search fallback and top-level category auto-detection below.
 */
export const matchesAllWords = (text: string, query: string): boolean => {
    const words = query.trim().split(/\s+/).filter(Boolean);
    return words.length > 0 && words.every((word) => containsWord(text, word));
};

/** True if the search query matches an advert's title (used to prioritize title matches). */
export const matchesTitle = (advert: Pick<IAdvert, "title">, query: string): boolean =>
    matchesAllWords(advert.title, query);

/**
 * Best-effort top-level category inference for a free-text search query — used when the
 * user searches without already being inside a category (e.g. header search bar / `/search`)
 * so the sidebar can still surface a relevant set of dynamic filters. Two-step heuristic:
 *   1) the query itself names a top-level category as a standalone word (e.g. "авто" ->
 *      "Авто");
 *   2) otherwise, whichever top-level category the actual matching adverts mostly belong to
 *      (e.g. "айфон" isn't a category name, but the ad it matches is filed under Електроніка).
 * Returns undefined when nothing matches. Never restricts the visible listing on its own —
 * callers use it purely to drive filter UI / breadcrumbs.
 */
export const detectTopLevelCategoryFromSearch = (query: string): ICategory | undefined => {
    const trimmed = query.trim();
    if (!trimmed) return undefined;

    const topLevel = getSeedTopLevelCategories();

    const byName = topLevel.find((c) => containsWord(c.name, trimmed));
    if (byName) return byName;

    const topLevelIdByCategoryId = new Map<number, number>();
    const assignTopLevel = (category: ICategory, topId: number) => {
        topLevelIdByCategoryId.set(category.id, topId);
        category.childs.forEach((child) => assignTopLevel(child, topId));
    };
    topLevel.forEach((c) => assignTopLevel(c, c.id));

    const matches = getSeedAdverts().filter(
        (a) =>
            matchesAllWords(a.title, trimmed) ||
            matchesAllWords(a.description, trimmed) ||
            matchesAllWords(a.categoryName, trimmed)
    );
    if (matches.length === 0) return undefined;

    const counts = new Map<number, number>();
    matches.forEach((a) => {
        const topId = topLevelIdByCategoryId.get(a.categoryId);
        if (topId !== undefined) counts.set(topId, (counts.get(topId) ?? 0) + 1);
    });

    let bestId: number | undefined;
    let bestCount = 0;
    counts.forEach((count, candidateId) => {
        if (count > bestCount) {
            bestCount = count;
            bestId = candidateId;
        }
    });

    return bestId !== undefined ? topLevel.find((c) => c.id === bestId) : undefined;
};


/** Look up a seed-hydrated seller by its synthetic (negative) id — lets callers route straight
 *  to local mock data for ids the real backend can never resolve (e.g. GET /api/User/get/-1747
 *  returns 400 Bad Request for negative/seed-only ids; see profileService.isRealUserId). */
export const findSeedSellerById = (id: number): ISellerShort | undefined =>
    getSeedSellers().find((s) => s.id === id);

/** Public-safe seller profiles hydrated once from users.seed.json (no password/photo blob). */
export const getSeedSellers = (): ISellerShort[] => {
    if (cachedSellers) return cachedSellers;

    cachedSellers = (usersSeed as SeederUserModel[]).map((model) => ({
        id: nextId(),
        email: model.email,
        phoneNumber: model.phoneNumber,
        firstName: model.firstName,
        lastName: model.lastName,
        // Real per-seller Unsplash portrait when the fixture has one (users.seed.json), instead
        // of always falling back to the generic UserOutlined icon on every seller card.
        photo: model.photo ?? null,
        lastActivity: new Date().toISOString(),
        createdDate: new Date().toISOString(),
        webSite: null,
        settlementDescrption: null,
        // Distinct, realistic per-user values from users.seed.json — previously every seed
        // seller rendered the exact same hardcoded 4.5/(0), which looked fake on the "Популярні
        // продавці" cards. 5.0/0 fallback only kicks in for a fixture entry with no rating at all.
        rating: model.rating ?? 5.0,
        reviewsCount: model.reviewsCount ?? 0,
        // Seed-fallback data has no real SignalR connection to be online with.
        isOnline: false,
        lastSeen: new Date().toISOString(),
    }));

    return cachedSellers;
};
