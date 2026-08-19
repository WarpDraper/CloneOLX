import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Pagination, Slider } from "antd";
import { AppstoreOutlined, CloseOutlined, SearchOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useGetCategoryTreeByIdQuery } from "../../../services/categoryService";
import { useGetAdvertsPageQuery } from "../../../services/advertService";
import { useGetFiltersByRangeMutation } from "../../../services/filterService";
import { useAddToFavoritesMutation, useGetFavoritesQuery, useRemoveFromFavoritesMutation } from "../../../services/accountService";
import { useGetAreasQuery, useGetRegionsByAreaQuery } from "../../../services/newPostService";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";
import AdvertList from "../../../components/advert/AdvertList";
import FallbackImage from "../../../components/common/FallbackImage";
import CubeLoader from "../../../components/common/CubeLoader";
import { buildImageUrl, IMAGE_SIZES } from "../../../utils/buildImageUrl";
import type { IAdvert } from "../../../types/advert/IAdvert";
import type { IFilter } from "../../../types/filter/IFilter";
import type { ICategory } from "../../../types/category/ICategory";
import { arrangeFeedWithTopAds } from "../../../utils/arrangeFeedWithTopAds";
import { CONDITION_FILTER_NAME, isConditionApplicable } from "../../../utils/advertSpecs";
import { UA_CITIES } from "../../../data/ukrainianCities";
import { useMinLoadingTime } from "../../../hooks/useMinLoadingTime";

// Bumped up from 16 — a small page size meant categories with fewer/older listings (e.g.
// Авто, Нерухомість) needed extra clicks through pagination to ever appear in the general
// "Всі оголошення" feed. Pagination itself (below) already computes total pages correctly
// off `total`/PAGE_SIZE — this only changes how many adverts load per page.
const PAGE_SIZE = 24;
// How many "Схожі товари" fallback cards to show under the divider when the real search/filter
// yields zero matches (or the current page runs out of results).
const FALLBACK_RECOMMENDATIONS_COUNT = 12;
// Radius slider threshold: below this, the narrower Nova Poshta Region (raion) is used for the
// location filter; at/above it, the broader Area (oblast) is used. See applyLocationFilter below
// for why this is a two-tier approximation rather than a true geographic radius.
const RADIUS_REGION_THRESHOLD_KM = 50;
const MAX_RADIUS_KM = 100;

type SortOption = "newest" | "cheap" | "expensive" | "popularity";
type ViewMode = "grid" | "list";

// Category itself + every descendant subcategory, recursively — so selecting a parent
// category strictly matches adverts under it or any of its children, never the full set.
const collectCategoryIds = (category: ICategory): number[] => [
    category.id,
    ...category.childs.flatMap(collectCategoryIds),
];

// Filter values that are purely numeric ("50", "6.5\" і більше" -> 6.5, "144 Гц" -> 144) read
// better as a range slider than a wall of checkboxes. Extracts the leading number so units
// (Гц, ГБ, дюймів...) don't stop a group from being treated as a range.
const parseLeadingNumber = (raw: string): number | null => {
    const match = raw.replace(",", ".").match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : null;
};

const isRangeFacet = (facet: Pick<IFilter, "values">): boolean => {
    const values = facet.values ?? [];
    return values.length > 1 && values.every((v) => parseLeadingNumber(v.value) !== null);
};

// Frame 234: категорійна сторінка / результати пошуку — сайдбар фільтрів, стрічка підкатегорій,
// таби сортування, сітка оголошень та пагінація. Обслуговує і /category/:id, і /search?q=...
const CategoryListingPage: React.FC = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id?: string }>();
    const categoryId = id ? Number(id) : undefined;
    const [searchParams, setSearchParams] = useSearchParams();
    // Accept both ?q= (used by the header/hero search bar today) and ?query= (per spec).
    const rawSearchText = searchParams.get("q") ?? searchParams.get("query") ?? undefined;
    const searchText = rawSearchText?.trim() || undefined;
    const city = searchParams.get("city") ?? undefined;
    const page = Number(searchParams.get("page") ?? "1");

    const { isAuth } = useSelector((state: RootState) => state.auth);

    const [sort, setSort] = useState<SortOption>("newest");
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [priceFrom, setPriceFrom] = useState<string>("");
    const [priceTo, setPriceTo] = useState<string>("");
    const [appliedPriceFrom, setAppliedPriceFrom] = useState<number | undefined>(undefined);
    const [appliedPriceTo, setAppliedPriceTo] = useState<number | undefined>(undefined);
    const [selectedFacets, setSelectedFacets] = useState<Record<number, number[]>>({});

    // Локальний чернетковий текст пошуку в цій категорії/видачі — НЕ фільтрує на кожне
    // натискання клавіші. Застосовується в URL (?q=) лише по Enter або кліку на кнопку пошуку
    // (applySearch нижче), як того вимагає спека "search only on Enter/button click". Синхронізується
    // з URL в зворотному напрямку (напр. коли пошук очищено чипом hasActiveFilters, або коли
    // перехід сюди стався з іншим ?q= ззовні).
    const [searchDraft, setSearchDraft] = useState(searchText ?? "");
    useEffect(() => {
        setSearchDraft(searchText ?? "");
    }, [searchText]);
    const applySearch = () => {
        const trimmed = searchDraft.trim();
        if (trimmed === (searchText ?? "")) return;
        const next = new URLSearchParams(searchParams);
        if (trimmed) next.set("q", trimmed);
        else next.delete("q");
        next.delete("query");
        next.set("page", "1");
        setSearchParams(next);
    };

    // Область/район (Nova Poshta) + радіус — див. коментар біля RADIUS_REGION_THRESHOLD_KM.
    const [areaRef, setAreaRefState] = useState<string | undefined>(undefined);
    const [regionRef, setRegionRefState] = useState<string | undefined>(undefined);
    const [radiusKm, setRadiusKm] = useState<number>(MAX_RADIUS_KM);
    const { data: npAreas = [] } = useGetAreasQuery();
    const { data: npRegions = [] } = useGetRegionsByAreaQuery(areaRef ?? "", { skip: !areaRef });
    // Two-tier approximation of a "0-100km radius" filter: Nova Poshta's settlement data (as
    // exposed by this app's NewPost integration) has no lat/lng, so a literal geographic radius
    // isn't computable. Instead: below the threshold, narrow to the selected Region (raion,
    // roughly city-sized); at/above it, widen to the selected Area (oblast) — a coarse but honest
    // stand-in for "nearby" vs "anywhere in range" given the data actually available.
    const effectiveRegionRef = areaRef && regionRef && radiusKm < RADIUS_REGION_THRESHOLD_KM ? regionRef : undefined;
    const effectiveAreaRef = areaRef && !effectiveRegionRef ? areaRef : undefined;

    // Повне піддерево (з усіма вкладеними підкатегоріями), а не лише один рівень — потрібно
    // для строгої фільтрації "категорія + всі її підкатегорії" нижче.
    const { data: category } = useGetCategoryTreeByIdQuery(categoryId!, { skip: !categoryId });
    const effectiveCategory = category;
    const displayCategory = effectiveCategory;

    const { data: favorites } = useGetFavoritesQuery(undefined, { skip: !isAuth });
    const [addToFavorites] = useAddToFavoritesMutation();
    const [removeFromFavorites] = useRemoveFromFavoritesMutation();

    // Динамічні фасети (Виробник, Країна виробник тощо) — беремо з переліку filter id категорії.
    const [getFiltersByRange, { data: facetDefinitions }] = useGetFiltersByRangeMutation();
    useEffect(() => {
        if (category && category.filters.length > 0) {
            getFiltersByRange(category.filters);
        }
    }, [category, getFiltersByRange]);

    const facets = facetDefinitions ?? [];
    // filterId -> name, resolved from whichever facet set is active — passed to cards so they
    // can label short specs (engine, RAM, brand...) without an extra per-card lookup.
    const filterNameById = useMemo(
        () => new Map<number, string>(facets.map((f): [number, string] => [f.id, f.name])),
        [facets]
    );

    // Скидаємо вибрані фасети/сторінку при зміні категорії (включно з автоматично
    // визначеною категорією за текстом пошуку).
    useEffect(() => {
        setSelectedFacets({});
    }, [categoryId, displayCategory?.id]);

    const filterGroups = useMemo(
        () => Object.values(selectedFacets).filter((group) => group.length > 0),
        [selectedFacets]
    );

    // Категорія + всі її підкатегорії — для реального API запиту. Ніколи не показуємо весь
    // каталог, коли обрано категорію.
    const matchingCategoryIds = useMemo(() => {
        if (!categoryId) return undefined;
        return effectiveCategory ? collectCategoryIds(effectiveCategory) : [categoryId];
    }, [categoryId, effectiveCategory]);

    const sortKey = sort === "newest" ? "date" : sort === "popularity" ? "popularity" : "price";
    const isDescending = sort === "newest" || sort === "expensive" || sort === "popularity";

    const { data: page1Response, isLoading: isAdvertsPageLoading } = useGetAdvertsPageQuery({
        size: PAGE_SIZE,
        page,
        search: searchText,
        categoryIds: matchingCategoryIds,
        priceFrom: appliedPriceFrom,
        priceTo: appliedPriceTo,
        filters: filterGroups.length > 0 ? filterGroups : undefined,
        settlementSearch: city,
        regionRef: effectiveRegionRef,
        areaRef: effectiveAreaRef,
        sortKey,
        isDescending,
        approved: true,
    });

    const apiAdverts = page1Response?.items ?? [];
    // Keeps the CubeLoader overlay visible for at least 500ms so it never flashes on/off
    // for fast responses.
    const isLoading = useMinLoadingTime(isAdvertsPageLoading, 500);

    const rawAdverts = apiAdverts;
    const total = page1Response?.total ?? 0;
    // Reorder so a premium ("ТОП") card lands after every 4-5 regular ones.
    const adverts = useMemo(() => arrangeFeedWithTopAds(rawAdverts), [rawAdverts]);

    // "Схожі товари" fallback: when the current search/filter combination has zero matches,
    // fetch an unfiltered set from the real API so the page never dead-ends on
    // "Нічого не знайдено" with no way forward. Only fetched once the primary result is
    // confirmed empty. If the API itself returns nothing, this section simply doesn't render —
    // no mock/placeholder cards.
    const needsFallbackRecommendations = !isLoading && total === 0;
    const { data: fallbackPageResponse } = useGetAdvertsPageQuery(
        { size: FALLBACK_RECOMMENDATIONS_COUNT, page: 1, sortKey: "random", isDescending: true, approved: true },
        { skip: !needsFallbackRecommendations }
    );
    const fallbackRecommendations = useMemo(() => {
        if (!needsFallbackRecommendations) return [];
        return arrangeFeedWithTopAds(fallbackPageResponse?.items ?? []);
    }, [needsFallbackRecommendations, fallbackPageResponse]);

    const setPage = (newPage: number) => {
        const next = new URLSearchParams(searchParams);
        next.set("page", String(newPage));
        setSearchParams(next);
    };

    const applyPriceRange = () => {
        setAppliedPriceFrom(priceFrom ? Number(priceFrom) : undefined);
        setAppliedPriceTo(priceTo ? Number(priceTo) : undefined);
        setPage(1);
    };

    const toggleFacetValue = (filterId: number, valueId: number) => {
        setSelectedFacets((prev) => {
            const current = prev[filterId] ?? [];
            const next = current.includes(valueId)
                ? current.filter((v) => v !== valueId)
                : [...current, valueId];
            return { ...prev, [filterId]: next };
        });
        setPage(1);
    };

    const handleToggleFavorite = (advert: IAdvert) => {
        if (!isAuth) return;
        const isFav = favorites?.some((f) => f.id === advert.id);
        if (isFav) {
            removeFromFavorites(advert.id);
        } else {
            addToFavorites(advert.id);
        }
    };

    const clearSearch = () => {
        const next = new URLSearchParams(searchParams);
        next.delete("q");
        next.delete("query");
        setSearchParams(next);
        setSearchDraft("");
    };

    const setCity = (value: string | undefined) => {
        const next = new URLSearchParams(searchParams);
        if (value) next.set("city", value);
        else next.delete("city");
        next.set("page", "1");
        setSearchParams(next);
    };

    const setArea = (value: string | undefined) => {
        setAreaRefState(value);
        setRegionRefState(undefined);
        setPage(1);
    };
    const setRegion = (value: string | undefined) => {
        setRegionRefState(value);
        setPage(1);
    };
    const clearLocationFilter = () => {
        setAreaRefState(undefined);
        setRegionRefState(undefined);
        setRadiusKm(MAX_RADIUS_KM);
        setPage(1);
    };

    const facetNameById = new Map((category?.filters ?? []).map((fid, i) => [fid, category?.filterNames[i]]));

    const hasActiveFilters =
        !!searchText || !!city || appliedPriceFrom !== undefined || appliedPriceTo !== undefined || filterGroups.length > 0 || !!areaRef;

    return (
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-6">
            <nav className="text-xs text-gray-400 mb-4 flex items-center gap-1.5">
                <Link to="/" className="hover:text-mm-purple">{t('categoryListing.breadcrumb.home')}</Link>
                <span>/</span>
                <Link to="/categories" className="hover:text-mm-purple">{t('categoryListing.breadcrumb.allCategories')}</Link>
                {displayCategory?.parentName && (
                    <>
                        <span>/</span>
                        <span>{displayCategory.parentName}</span>
                    </>
                )}
                {displayCategory && (
                    <>
                        <span>/</span>
                        <span className="text-mm-navy font-medium">{displayCategory.name}</span>
                    </>
                )}
            </nav>

            <h1 className="text-2xl font-bold text-mm-navy text-center mb-6">
                {effectiveCategory
                    ? effectiveCategory.name
                    : searchText
                    ? t('categoryListing.searchResults', { query: searchText })
                    : t('categoryListing.allAdverts')}
            </h1>

            {displayCategory && displayCategory.childs.length > 0 && (
                // overflow-x-auto + scrollbar-hide: smooth native horizontal scroll with no
                // visible scrollbar track. No justify-center here on purpose — centering a
                // flex row that's wider than its container pushes the first tiles off-screen
                // to the left, which is what made the rail feel like it "overflowed abruptly"
                // and made scrolling to the start awkward.
                <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide px-4 py-2 mb-8">
                    {displayCategory.childs.map((child) => (
                        <Link
                            key={child.id}
                            to={`/category/${child.id}`}
                            className="flex flex-col items-center gap-2 flex-shrink-0 w-20 md:w-24 group"
                        >
                            <div className="relative w-16 h-16 aspect-square rounded-full overflow-hidden flex-shrink-0 bg-gray-100 border-2 border-transparent group-hover:border-mm-purple transition-colors">
                                <FallbackImage
                                    src={buildImageUrl(child.image, IMAGE_SIZES.thumbnail)}
                                    fallbackKeyword={child.name}
                                    uniqueSeed={child.id}
                                    alt={child.name}
                                    className="w-full h-full object-cover object-center scale-125"
                                    placeholder={<div className="w-full h-full flex items-center justify-center"><AppstoreOutlined className="text-mm-purple" /></div>}
                                />
                            </div>
                            {/* line-clamp-2 + fixed tile width: long labels (e.g. "Продукти
                                харчування / напої") wrap to at most 2 tidy lines instead of
                                breaking into ragged multi-line fragments or overflowing the
                                tile's border. */}
                            <span className="text-xs text-center text-gray-600 group-hover:text-mm-purple leading-tight line-clamp-2 w-full">
                                {child.name}
                            </span>
                        </Link>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <aside className="lg:col-span-1 flex flex-col gap-6">
                    <div>
                        <h3 className="text-sm font-bold text-mm-navy mb-3">{t('categoryListing.filters.search')}</h3>
                        {/* Filtering only happens on Enter or a click on the search icon button —
                            no per-keystroke query/filtering. */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={applySearch}
                                aria-label={t('categoryListing.filters.search')}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-mm-purple text-sm"
                            >
                                <SearchOutlined />
                            </button>
                            <input
                                type="text"
                                placeholder={t('categoryListing.filters.searchPlaceholder')}
                                value={searchDraft}
                                onChange={(e) => setSearchDraft(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                                className="w-full border border-gray-200 rounded-md pl-8 pr-2 py-1.5 text-sm outline-none focus:border-mm-purple"
                            />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-mm-navy mb-3">{t('categoryListing.filters.price')}</h3>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                placeholder={t('categoryListing.filters.priceFrom')}
                                value={priceFrom}
                                onChange={(e) => setPriceFrom(e.target.value)}
                                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm outline-none focus:border-mm-purple"
                            />
                            <span className="text-gray-300">—</span>
                            <input
                                type="number"
                                placeholder={t('categoryListing.filters.priceTo')}
                                value={priceTo}
                                onChange={(e) => setPriceTo(e.target.value)}
                                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm outline-none focus:border-mm-purple"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={applyPriceRange}
                            className="mt-2 w-full bg-mm-navy text-white text-xs font-semibold py-2 rounded-md hover:bg-mm-navy/90 transition-colors"
                        >
                            {t('categoryListing.filters.apply')}
                        </button>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-mm-navy mb-3">{t('categoryListing.filters.city')}</h3>
                        <select
                            value={city ?? ""}
                            onChange={(e) => setCity(e.target.value || undefined)}
                            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm outline-none focus:border-mm-purple bg-white"
                        >
                            <option value="">{t('categoryListing.filters.allCities')}</option>
                            {UA_CITIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-mm-navy mb-3">{t('categoryListing.filters.areaAndRadius')}</h3>
                        <div className="flex flex-col gap-2">
                            <select
                                value={areaRef ?? ""}
                                onChange={(e) => setArea(e.target.value || undefined)}
                                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm outline-none focus:border-mm-purple bg-white"
                            >
                                <option value="">{t('categoryListing.filters.anyArea')}</option>
                                {npAreas.map((a) => (
                                    <option key={a.ref} value={a.ref}>{a.description}</option>
                                ))}
                            </select>
                            <select
                                value={regionRef ?? ""}
                                onChange={(e) => setRegion(e.target.value || undefined)}
                                disabled={!areaRef}
                                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm outline-none focus:border-mm-purple bg-white disabled:bg-gray-50 disabled:text-gray-400"
                            >
                                <option value="">{t('categoryListing.filters.anyRegion')}</option>
                                {npRegions.map((r) => (
                                    <option key={r.ref} value={r.ref}>{r.description}</option>
                                ))}
                            </select>
                            <div className={!areaRef ? "opacity-50 pointer-events-none" : undefined}>
                                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                    <span>{t('categoryListing.filters.searchRadius')}</span>
                                    <span className="font-semibold text-mm-navy">{t('categoryListing.filters.radiusKm', { count: radiusKm })}</span>
                                </div>
                                <Slider
                                    min={0}
                                    max={MAX_RADIUS_KM}
                                    step={5}
                                    value={radiusKm}
                                    disabled={!areaRef}
                                    onChange={(v) => setRadiusKm(v as number)}
                                    onChangeComplete={() => setPage(1)}
                                />
                            </div>
                            {areaRef && (
                                <button
                                    type="button"
                                    onClick={clearLocationFilter}
                                    className="text-xs text-gray-400 hover:text-mm-purple self-start"
                                >
                                    {t('categoryListing.filters.resetArea')}
                                </button>
                            )}
                        </div>
                    </div>

                    {facets.map((facet) => {
                        // "Стан" ("condition") doesn't apply to services/jobs/real estate/pets/etc
                        // — never render the New/Used facet there, even if a category was ever
                        // misconfigured with the "Стан" filter attached to it. See
                        // isConditionApplicable in utils/advertSpecs.ts for the same rule applied
                        // to the AdvertDetailsPage spec row and the condition badge on cards.
                        if (facet.name === CONDITION_FILTER_NAME && !isConditionApplicable(displayCategory?.name, displayCategory?.slug)) {
                            return null;
                        }

                        const values = facet.values ?? [];
                        const label = facetNameById.get(facet.id) ?? facet.name;

                        if (isRangeFacet(facet)) {
                            const numeric = values
                                .map((v) => ({ id: v.id, num: parseLeadingNumber(v.value) as number }))
                                .sort((a, b) => a.num - b.num);
                            const min = numeric[0].num;
                            const max = numeric[numeric.length - 1].num;

                            return (
                                <div key={facet.id}>
                                    <h3 className="text-sm font-bold text-mm-navy mb-3">{label}</h3>
                                    <Slider
                                        range
                                        min={min}
                                        max={max}
                                        defaultValue={[min, max]}
                                        onChangeComplete={([lo, hi]) => {
                                            const matching = numeric.filter((v) => v.num >= lo && v.num <= hi).map((v) => v.id);
                                            setSelectedFacets((prev) => ({ ...prev, [facet.id]: matching }));
                                            setPage(1);
                                        }}
                                    />
                                </div>
                            );
                        }

                        return (
                            <div key={facet.id}>
                                <h3 className="text-sm font-bold text-mm-navy mb-3">{label}</h3>
                                <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                                    {values.map((value) => (
                                        <label key={value.id} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-mm-navy">
                                            <input
                                                type="checkbox"
                                                checked={(selectedFacets[facet.id] ?? []).includes(value.id)}
                                                onChange={() => toggleFacetValue(facet.id, value.id)}
                                                className="accent-mm-purple"
                                            />
                                            {value.value}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </aside>

                <div className="lg:col-span-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center rounded-full overflow-hidden border border-gray-200 text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => { setSort("newest"); setPage(1); }}
                                className={`px-4 py-1.5 transition-colors ${sort === "newest" ? "bg-mm-purple text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                            >
                                {t('categoryListing.sort.newest')}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setSort("cheap"); setPage(1); }}
                                className={`px-4 py-1.5 transition-colors border-l border-gray-200 ${sort === "cheap" ? "bg-mm-purple text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                            >
                                {t('categoryListing.sort.cheapFirst')}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setSort("expensive"); setPage(1); }}
                                className={`px-4 py-1.5 transition-colors border-l border-gray-200 ${sort === "expensive" ? "bg-mm-purple text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                            >
                                {t('categoryListing.sort.expensiveFirst')}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setSort("popularity"); setPage(1); }}
                                className={`px-4 py-1.5 transition-colors border-l border-gray-200 ${sort === "popularity" ? "bg-mm-purple text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                            >
                                {t('categoryListing.sort.popularity')}
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400">{t('categoryListing.advertsCount', { count: total })}</span>
                            <div className="flex items-center rounded-lg overflow-hidden border border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setViewMode("grid")}
                                    aria-label={t('categoryListing.viewMode.grid')}
                                    aria-pressed={viewMode === "grid"}
                                    className={`w-8 h-8 flex items-center justify-center transition-colors ${viewMode === "grid" ? "bg-mm-purple text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                                >
                                    <AppstoreOutlined />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode("list")}
                                    aria-label={t('categoryListing.viewMode.list')}
                                    aria-pressed={viewMode === "list"}
                                    className={`w-8 h-8 flex items-center justify-center transition-colors border-l border-gray-200 ${viewMode === "list" ? "bg-mm-purple text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                                >
                                    <UnorderedListOutlined />
                                </button>
                            </div>
                        </div>
                    </div>

                    {hasActiveFilters && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {searchText && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="flex items-center gap-1.5 bg-mm-lavender text-mm-purple text-xs font-medium px-3 py-1.5 rounded-full hover:bg-purple-100"
                                >
                                    «{searchText}» <CloseOutlined className="text-[10px]" />
                                </button>
                            )}
                            {(appliedPriceFrom !== undefined || appliedPriceTo !== undefined) && (
                                <button
                                    type="button"
                                    onClick={() => { setAppliedPriceFrom(undefined); setAppliedPriceTo(undefined); setPriceFrom(""); setPriceTo(""); }}
                                    className="flex items-center gap-1.5 bg-mm-lavender text-mm-purple text-xs font-medium px-3 py-1.5 rounded-full hover:bg-purple-100"
                                >
                                    {appliedPriceFrom ?? 0} – {appliedPriceTo ?? "∞"} ₴ <CloseOutlined className="text-[10px]" />
                                </button>
                            )}
                            {city && (
                                <button
                                    type="button"
                                    onClick={() => setCity(undefined)}
                                    className="flex items-center gap-1.5 bg-mm-lavender text-mm-purple text-xs font-medium px-3 py-1.5 rounded-full hover:bg-purple-100"
                                >
                                    {city} <CloseOutlined className="text-[10px]" />
                                </button>
                            )}
                            {areaRef && (
                                <button
                                    type="button"
                                    onClick={clearLocationFilter}
                                    className="flex items-center gap-1.5 bg-mm-lavender text-mm-purple text-xs font-medium px-3 py-1.5 rounded-full hover:bg-purple-100"
                                >
                                    {npAreas.find((a) => a.ref === areaRef)?.description ?? t('categoryListing.filters.area')}
                                    {regionRef && radiusKm < RADIUS_REGION_THRESHOLD_KM
                                        ? ` · ${npRegions.find((r) => r.ref === regionRef)?.description ?? ""}`
                                        : ""}
                                    {" "}({radiusKm} {t('categoryListing.filters.km')}) <CloseOutlined className="text-[10px]" />
                                </button>
                            )}
                            {Object.entries(selectedFacets).flatMap(([filterId, valueIds]) =>
                                valueIds.map((valueId) => {
                                    const facet = facets.find((f) => f.id === Number(filterId));
                                    const value = facet?.values?.find((v) => v.id === valueId);
                                    if (!value) return null;
                                    return (
                                        <button
                                            key={`${filterId}-${valueId}`}
                                            type="button"
                                            onClick={() => toggleFacetValue(Number(filterId), valueId)}
                                            className="flex items-center gap-1.5 bg-mm-lavender text-mm-purple text-xs font-medium px-3 py-1.5 rounded-full hover:bg-purple-100"
                                        >
                                            {value.value} <CloseOutlined className="text-[10px]" />
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex justify-center items-center py-24">
                            <CubeLoader />
                        </div>
                    ) : adverts.length === 0 ? (
                        <p className="text-center text-gray-400 py-16">{t('categoryListing.noResults')}</p>
                    ) : (
                        <AdvertList
                            adverts={adverts}
                            viewMode={viewMode}
                            onToggleFavorite={handleToggleFavorite}
                            isFavorite={(advert) => favorites?.some((f) => f.id === advert.id) ?? false}
                            filterNameById={filterNameById}
                        />
                    )}

                    {total > PAGE_SIZE && (
                        <div className="flex justify-center mt-8">
                            <Pagination current={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} showSizeChanger={false} />
                        </div>
                    )}

                    {/* "Схожі товари" fallback — search/filters matched nothing, so instead of a
                        dead end we show an unfiltered sample below a divider, letting the user
                        keep scrolling/browsing rather than hitting a wall. */}
                    {!isLoading && fallbackRecommendations.length > 0 && (
                        <div className="mt-10">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="h-px flex-1 bg-gray-200" />
                                <span className="text-sm font-semibold text-gray-400 shrink-0">{t('categoryListing.similarProducts')}</span>
                                <div className="h-px flex-1 bg-gray-200" />
                            </div>
                            <AdvertList
                                adverts={fallbackRecommendations}
                                viewMode={viewMode}
                                onToggleFavorite={handleToggleFavorite}
                                isFavorite={(advert) => favorites?.some((f) => f.id === advert.id) ?? false}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CategoryListingPage;
