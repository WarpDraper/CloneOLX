import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Pagination, Slider } from "antd";
import { AppstoreOutlined, CloseOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { useGetCategoryTreeByIdQuery } from "../../../services/categoryService";
import { useGetAdvertsPageQuery } from "../../../services/advertService";
import { useGetFiltersByRangeMutation } from "../../../services/filterService";
import { useAddToFavoritesMutation, useGetFavoritesQuery, useRemoveFromFavoritesMutation } from "../../../services/accountService";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";
import AdvertCard from "../../../components/advert/AdvertCard";
import AdvertListItem from "../../../components/advert/AdvertListItem";
import { buildImageUrl, IMAGE_SIZES } from "../../../utils/buildImageUrl";
import type { IAdvert } from "../../../types/advert/IAdvert";
import type { IFilter } from "../../../types/filter/IFilter";
import type { ICategory } from "../../../types/category/ICategory";
import {
    findSeedCategoryById,
    getSeedAdverts,
    getSeedFiltersByNames,
    detectTopLevelCategoryFromSearch,
    matchesAllWords,
    matchesTitle,
} from "../../../utils/seedHydration";
import { UA_CITIES } from "../../../data/ukrainianCities";

const PAGE_SIZE = 16;

type SortOption = "newest" | "cheap" | "expensive";
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

    // Повне піддерево (з усіма вкладеними підкатегоріями), а не лише один рівень — потрібно
    // для строгої фільтрації "категорія + всі її підкатегорії" нижче.
    const { data: category } = useGetCategoryTreeByIdQuery(categoryId!, { skip: !categoryId });
    // Офлайн-фолбек: якщо реальний API категорій недоступний (бекенд лежить / щойно піднята
    // БД), резолвимо категорію із seed-дерева за тим самим id, щоб хлібні крихти, підкатегорії
    // та фасети відпрацьовували і в офлайн-режимі.
    const seedCategory = useMemo(
        () => (categoryId !== undefined ? findSeedCategoryById(categoryId) : undefined),
        [categoryId]
    );
    const effectiveCategory = category ?? seedCategory;

    // Auto-detect the top-level category a free-text search belongs to (e.g. "авто" -> "Авто")
    // when the user isn't already browsing a specific category (plain /search?q=... route).
    // Only used to drive the sidebar's dynamic filters and breadcrumb below — it never
    // restricts which adverts are listed, so it can't hide legitimate cross-category matches
    // or interfere with the real API's own (unscoped) search query.
    const detectedCategory = useMemo(
        () => (!categoryId && searchText ? detectTopLevelCategoryFromSearch(searchText) : undefined),
        [categoryId, searchText]
    );
    const displayCategory = effectiveCategory ?? detectedCategory;

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

    // Фолбек на локальні seed-фільтри (filters.seed.json), якщо бекенд не повернув фасетів
    // (порожньо/помилка/ще не завантажено) — підбираються за іменами (`category.filterNames`),
    // які присутні і в реальних категоріях з API, і в seed-гідратованих.
    const seedFacetDefinitions = useMemo(
        () => (displayCategory ? getSeedFiltersByNames(displayCategory.filterNames) : []),
        [displayCategory]
    );
    const facets = facetDefinitions && facetDefinitions.length > 0 ? facetDefinitions : seedFacetDefinitions;
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

    // Категорія + всі її підкатегорії — і для реального API запиту, і для клієнтської
    // фільтрації seed-фолбеку нижче. Ніколи не показуємо весь каталог, коли обрано категорію.
    const matchingCategoryIds = useMemo(() => {
        if (!categoryId) return undefined;
        return effectiveCategory ? collectCategoryIds(effectiveCategory) : [categoryId];
    }, [categoryId, effectiveCategory]);

    const { data: page1Response, isLoading } = useGetAdvertsPageQuery({
        size: PAGE_SIZE,
        page,
        search: searchText,
        categoryIds: matchingCategoryIds,
        priceFrom: appliedPriceFrom,
        priceTo: appliedPriceTo,
        filters: filterGroups.length > 0 ? filterGroups : undefined,
        settlementSearch: city,
        sortKey: sort === "newest" ? "date" : "price",
        isDescending: sort === "newest" ? true : sort === "expensive",
        approved: true,
    });

    // Фолбек на локальні seed-дані (Adverts.json), якщо бекенд не повернув оголошень
    // (offline dev / щойно піднята БД). Не застосовується, поки триває реальний запит.
    const apiAdverts = page1Response?.items ?? [];
    const usingSeedFallback = !isLoading && apiAdverts.length === 0;

    // Строга клієнтська фільтрація/сортування seed-даних — дзеркалить те, що реальний API
    // робить на бекенді (категорія + підкатегорії, ціна, обрані фасети), без фолбеку на
    // "показати все", якщо після фільтрації нічого не залишилось.
    const filteredSeedAdverts = useMemo(() => {
        if (!usingSeedFallback) return [];
        let list = getSeedAdverts();

        if (matchingCategoryIds) {
            const idSet = new Set(matchingCategoryIds);
            list = list.filter((a) => idSet.has(a.categoryId));
        }
        if (appliedPriceFrom !== undefined) list = list.filter((a) => a.price >= appliedPriceFrom);
        if (appliedPriceTo !== undefined) list = list.filter((a) => a.price <= appliedPriceTo);
        if (filterGroups.length > 0) {
            list = list.filter((a) =>
                filterGroups.every((group) => group.some((valueId) => a.filterValues.some((fv) => fv.id === valueId)))
            );
        }
        if (searchText) {
            // Standalone-word match over title + description — "авто" matches "Авто продам"
            // but not "автономне опалення"/"автоматична коробка". Never falls back to the
            // unfiltered list, so an unmatched query correctly shows "Нічого не знайдено"
            // instead of the whole catalog.
            list = list.filter((a) => matchesAllWords(a.title, searchText) || matchesAllWords(a.description, searchText));
        }
        if (city) {
            list = list.filter((a) => a.settlementName === city);
        }

        const sorted = [...list].sort((a, b) => {
            if (sort === "cheap") return a.price - b.price;
            if (sort === "expensive") return b.price - a.price;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        if (!searchText) return sorted;

        // Prioritize title matches over description-only matches, preserving the chosen
        // sort order within each group (Array#sort is stable).
        return [...sorted].sort((a, b) => Number(matchesTitle(b, searchText)) - Number(matchesTitle(a, searchText)));
    }, [usingSeedFallback, matchingCategoryIds, appliedPriceFrom, appliedPriceTo, filterGroups, searchText, city, sort]);

    const pagedSeedAdverts = useMemo(
        () => filteredSeedAdverts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [filteredSeedAdverts, page]
    );

    const adverts = usingSeedFallback ? pagedSeedAdverts : apiAdverts;
    const total = usingSeedFallback ? filteredSeedAdverts.length : page1Response?.total ?? 0;

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
    };

    const setCity = (value: string | undefined) => {
        const next = new URLSearchParams(searchParams);
        if (value) next.set("city", value);
        else next.delete("city");
        next.set("page", "1");
        setSearchParams(next);
    };

    const facetNameById = new Map((category?.filters ?? []).map((fid, i) => [fid, category?.filterNames[i]]));

    const hasActiveFilters = !!searchText || !!city || appliedPriceFrom !== undefined || appliedPriceTo !== undefined || filterGroups.length > 0;

    return (
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-6">
            <nav className="text-xs text-gray-400 mb-4 flex items-center gap-1.5">
                <Link to="/" className="hover:text-mm-purple">Головна</Link>
                <span>/</span>
                <Link to="/categories" className="hover:text-mm-purple">Всі категорії</Link>
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
                    ? `Результати пошуку: «${searchText}»`
                    : "Всі оголошення"}
            </h1>

            {displayCategory && displayCategory.childs.length > 0 && (
                <div className="flex gap-6 overflow-x-auto pb-2 mb-8 justify-center">
                    {displayCategory.childs.map((child) => (
                        <Link
                            key={child.id}
                            to={`/category/${child.id}`}
                            className="flex flex-col items-center gap-2 shrink-0 w-[90px] group"
                        >
                            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-transparent group-hover:border-mm-purple transition-colors">
                                {child.image ? (
                                    <img src={buildImageUrl(child.image, IMAGE_SIZES.thumbnail) ?? undefined} alt={child.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center"><AppstoreOutlined className="text-mm-purple" /></div>
                                )}
                            </div>
                            <span className="text-xs text-center text-gray-600 group-hover:text-mm-purple leading-tight">{child.name}</span>
                        </Link>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <aside className="lg:col-span-1 flex flex-col gap-6">
                    <div>
                        <h3 className="text-sm font-bold text-mm-navy mb-3">Ціна, ₴</h3>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                placeholder="від"
                                value={priceFrom}
                                onChange={(e) => setPriceFrom(e.target.value)}
                                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm outline-none focus:border-mm-purple"
                            />
                            <span className="text-gray-300">—</span>
                            <input
                                type="number"
                                placeholder="до"
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
                            Застосувати
                        </button>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-mm-navy mb-3">Місто</h3>
                        <select
                            value={city ?? ""}
                            onChange={(e) => setCity(e.target.value || undefined)}
                            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm outline-none focus:border-mm-purple bg-white"
                        >
                            <option value="">Всі міста</option>
                            {UA_CITIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {facets.map((facet) => {
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
                                За новизною
                            </button>
                            <button
                                type="button"
                                onClick={() => { setSort("cheap"); setPage(1); }}
                                className={`px-4 py-1.5 transition-colors border-l border-gray-200 ${sort === "cheap" ? "bg-mm-purple text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                            >
                                Дешевші
                            </button>
                            <button
                                type="button"
                                onClick={() => { setSort("expensive"); setPage(1); }}
                                className={`px-4 py-1.5 transition-colors border-l border-gray-200 ${sort === "expensive" ? "bg-mm-purple text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                            >
                                Дорожчі
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400">{total} оголошень</span>
                            <div className="flex items-center rounded-lg overflow-hidden border border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setViewMode("grid")}
                                    aria-label="Сітка"
                                    aria-pressed={viewMode === "grid"}
                                    className={`w-8 h-8 flex items-center justify-center transition-colors ${viewMode === "grid" ? "bg-mm-purple text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                                >
                                    <AppstoreOutlined />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode("list")}
                                    aria-label="Список"
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
                        <p className="text-center text-gray-400 py-16">Завантаження оголошень...</p>
                    ) : adverts.length === 0 ? (
                        <p className="text-center text-gray-400 py-16">Нічого не знайдено.</p>
                    ) : viewMode === "grid" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {adverts.map((advert) => (
                                <AdvertCard
                                    key={advert.id}
                                    advert={advert}
                                    onToggleFavorite={handleToggleFavorite}
                                    isFavorite={favorites?.some((f) => f.id === advert.id) ?? false}
                                    filterNameById={filterNameById}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {adverts.map((advert) => (
                                <AdvertListItem
                                    key={advert.id}
                                    advert={advert}
                                    onToggleFavorite={handleToggleFavorite}
                                    isFavorite={favorites?.some((f) => f.id === advert.id) ?? false}
                                    filterNameById={filterNameById}
                                />
                            ))}
                        </div>
                    )}

                    {total > PAGE_SIZE && (
                        <div className="flex justify-center mt-8">
                            <Pagination current={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} showSizeChanger={false} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CategoryListingPage;
