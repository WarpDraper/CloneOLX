import React from "react";
import { Link } from "react-router-dom";
import { AppstoreOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useGetCategoriesQuery } from "../../../services/categoryService";
import { buildImageUrl, IMAGE_SIZES } from "../../../utils/buildImageUrl";
import FallbackImage from "../../../components/common/FallbackImage";
import CubeLoader from "../../../components/common/CubeLoader";
import { useMinLoadingTime } from "../../../hooks/useMinLoadingTime";

// Frame 332: "Всі категорії" — вітрина всіх категорій верхнього рівня плиткою.
const CategoriesPage: React.FC = () => {
    const { t } = useTranslation();
    const { data: categories, isLoading, isError } = useGetCategoriesQuery();
    // Keeps the CubeLoader overlay visible for at least 500ms so it never flashes
    // on/off for fast/cached responses.
    const showLoading = useMinLoadingTime(isLoading, 500);
    const topLevelCategories = (categories ?? []).filter((c) => c.parentId === null);

    return (
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-8">
            <h1 className="text-2xl font-bold text-mm-navy text-center mb-8">{t('categories.title')}</h1>

            {showLoading && (
                <div className="flex justify-center py-12">
                    <CubeLoader />
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <Link
                    to="/search"
                    className="relative rounded-lg overflow-hidden aspect-[4/3] bg-mm-orange group border border-mm-orange flex flex-col items-center justify-center gap-2 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                    <AppstoreOutlined className="text-4xl text-white" />
                    <span className="text-white text-sm font-semibold">{t('categories.allProducts')}</span>
                </Link>
                {!showLoading && !isError && topLevelCategories.length === 0 && (
                    <p className="col-span-full text-center text-gray-400 py-10">{t('categories.empty')}</p>
                )}
                {topLevelCategories.map((category) => (
                    <Link
                        key={category.id}
                        to={`/category/${category.id}`}
                        className="relative w-full aspect-[4/3] overflow-hidden rounded-lg bg-neutral-900 group border border-gray-100 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                    >
                        {/* FallbackImage swaps to a keyword-matched Unsplash photo (and never a raw
                            broken <img>) whenever the backend-seeded file 404s or is missing — see
                            components/common/FallbackImage.tsx. */}
                        <FallbackImage
                            src={buildImageUrl(category.image, IMAGE_SIZES.card)}
                            fallbackKeyword={category.name}
                            uniqueSeed={category.id}
                            alt={category.name}
                            className="w-full h-full object-cover object-center scale-105 group-hover:scale-110 transition-transform duration-300"
                            placeholder={
                                <div className="w-full h-full flex items-center justify-center bg-mm-lavender-light">
                                    <AppstoreOutlined className="text-4xl text-mm-purple" />
                                </div>
                            }
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 py-2 px-3">
                            <span className="text-white text-sm font-medium">{category.name}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default CategoriesPage;
