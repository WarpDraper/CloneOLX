import React from "react";
import { Link } from "react-router-dom";
import { AppstoreOutlined } from "@ant-design/icons";
import { useGetCategoriesQuery } from "../../../services/categoryService";
import { buildImageUrl, IMAGE_SIZES } from "../../../utils/buildImageUrl";

// Frame 332: "Всі категорії" — вітрина всіх категорій верхнього рівня плиткою.
const CategoriesPage: React.FC = () => {
    const { data: categories, isLoading } = useGetCategoriesQuery();
    const topLevelCategories = (categories ?? []).filter((c) => c.parentId === null);

    return (
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-8">
            <h1 className="text-2xl font-bold text-mm-navy text-center mb-8">Всі категорії</h1>

            {isLoading && <p className="text-center text-gray-400">Завантаження категорій...</p>}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {topLevelCategories.map((category) => (
                    <Link
                        key={category.id}
                        to={`/category/${category.id}`}
                        className="relative rounded-lg overflow-hidden aspect-[4/3] bg-gray-100 group border border-gray-100"
                    >
                        {category.image ? (
                            <img
                                src={buildImageUrl(category.image, IMAGE_SIZES.card) ?? undefined}
                                alt={category.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-mm-lavender-light">
                                <AppstoreOutlined className="text-4xl text-mm-purple" />
                            </div>
                        )}
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
