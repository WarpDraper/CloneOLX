import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RightOutlined } from "@ant-design/icons";
import type { ICategory } from "../../types/category/ICategory";
import { getCategoryName } from "../../utils/getCategoryName";
import CategoryAvatar from "./CategoryAvatar";

interface MegaMenuProps {
    categories: ICategory[];
    onClose: () => void;
}

const COLUMN_ITEM_LIMIT = 8;

// Мега-меню каталогу (Frame 330): темний сайдбар категорій зліва, багатоколонковий
// список підкатегорій справа та візуальна стрічка підкатегорій знизу.
const MegaMenu: React.FC<MegaMenuProps> = ({ categories, onClose }) => {
    const { t, i18n } = useTranslation();
    const [activeId, setActiveId] = useState<number | null>(categories[0]?.id ?? null);
    const activeCategory = categories.find((c) => c.id === activeId) ?? categories[0] ?? null;

    // Розбиваємо дочірні категорії активної категорії на колонки по кілька елементів.
    const columns: ICategory[][] = [];
    if (activeCategory) {
        for (let i = 0; i < activeCategory.childs.length; i += COLUMN_ITEM_LIMIT) {
            columns.push(activeCategory.childs.slice(i, i + COLUMN_ITEM_LIMIT));
        }
    }

    // Візуальна стрічка: онуки активної категорії, що мають зображення (fallback — самі діти).
    const visualStripItems = activeCategory
        ? activeCategory.childs.flatMap((c) => (c.childs.length ? c.childs : [c])).filter((c) => c.image).slice(0, 8)
        : [];

    return (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 shadow-2xl rounded-b-xl overflow-hidden border border-black/10 bg-mm-navy">
            <div className="flex max-h-[70vh]">
                <div className="w-[260px] shrink-0 bg-mm-navy text-white overflow-y-auto py-3 flex flex-col">
                    <div className="px-5 pb-2 text-sm font-bold text-white/90">{t('home.catalog')}</div>
                    <Link
                        to="/categories"
                        onClick={onClose}
                        className="w-full flex items-center justify-between text-left px-5 py-2 text-sm font-semibold text-mm-orange hover:bg-white/10 transition-colors border-b border-white/10"
                    >
                        {t('home.allCategories')}
                        <RightOutlined className="text-[10px] opacity-60" />
                    </Link>
                    <Link
                        to="/search"
                        onClick={onClose}
                        className="w-full flex items-center justify-between text-left px-5 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors border-b border-white/10 mb-1"
                    >
                        {t('home.allProducts')}
                        <RightOutlined className="text-[10px] opacity-60" />
                    </Link>
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            type="button"
                            onMouseEnter={() => setActiveId(category.id)}
                            onClick={() => setActiveId(category.id)}
                            className={`w-full flex items-center justify-between text-left px-5 py-2 text-sm transition-colors ${
                                activeId === category.id
                                    ? "bg-mm-orange text-white font-semibold"
                                    : "text-white/80 hover:bg-white/10 hover:text-white"
                            }`}
                        >
                            {getCategoryName(category, i18n.language)}
                            {category.childs.length > 0 && <RightOutlined className="text-[10px] opacity-60" />}
                        </button>
                    ))}
                </div>

                <div className="flex-1 bg-mm-lavender-light overflow-y-auto p-6">
                    {!activeCategory ? (
                        <p className="text-sm text-gray-400">{t('megaMenu.noCategories')}</p>
                    ) : columns.length === 0 ? (
                        <Link
                            to={`/category/${activeCategory.id}`}
                            onClick={onClose}
                            className="text-sm font-semibold text-mm-purple hover:underline"
                        >
                            {t('megaMenu.viewCategory', { name: getCategoryName(activeCategory, i18n.language) })}
                        </Link>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {columns.map((column, columnIndex) => (
                                <div key={columnIndex}>
                                    {columnIndex === 0 && (
                                        <h3 className="text-sm font-semibold text-mm-navy mb-3">{getCategoryName(activeCategory, i18n.language)}</h3>
                                    )}
                                    <ul className="space-y-2">
                                        {column.map((child) => (
                                            <li key={child.id}>
                                                <Link
                                                    to={`/category/${child.id}`}
                                                    onClick={onClose}
                                                    className="text-sm text-gray-600 hover:text-mm-purple transition-colors"
                                                >
                                                    {getCategoryName(child, i18n.language)}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}

                    {visualStripItems.length > 0 && (
                        <div className="flex gap-6 mt-8 pt-6 border-t border-black/5 overflow-x-auto">
                            {visualStripItems.map((item) => (
                                <CategoryAvatar key={item.id} category={item} size={64} className="w-[100px]" onClick={onClose} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MegaMenu;
