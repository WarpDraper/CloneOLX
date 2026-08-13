import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Tabs, Pagination } from "antd";
import { HeartOutlined, SearchOutlined, ShopOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { RootState } from "../../../store";
import { useGetFavoritesQuery, useRemoveFromFavoritesMutation } from "../../../services/accountService";
import AdvertCard from "../../../components/advert/AdvertCard";
import AccountSidebar from "../../../components/account/AccountSidebar";

const PAGE_SIZE = 12;

// Frame 335: особистий кабінет — "Обране". Бічна навігація кабінету + верхні таби
// (Оголошення / Пошуки / Продавці). Сітка оголошень підʼєднана до useGetFavoritesQuery
// (GET /api/account/favorites) з пагінацією на клієнті — бекенд віддає повний список одразу.
// Таби "Пошуки" та "Продавці" — заглушки, оскільки для збережених пошуків/продавців
// наразі немає окремих сутностей чи ендпоінтів на бекенді.
const FavoritesPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isAuth } = useSelector((state: RootState) => state.auth);

    useEffect(() => {
        if (!isAuth) navigate("/login", { replace: true });
    }, [isAuth, navigate]);

    const { data: favorites = [], isLoading } = useGetFavoritesQuery(undefined, { skip: !isAuth });
    const [removeFromFavorites] = useRemoveFromFavoritesMutation();
    const [page, setPage] = useState(1);
    // Ids currently fading out — hidden immediately via CSS transition, then actually removed
    // from the API/cache once the transition finishes, so the card unmounts smoothly instead
    // of popping out the instant the list refetches.
    const [removingIds, setRemovingIds] = useState<number[]>([]);

    const handleUnfavorite = (advertId: number) => {
        setRemovingIds((prev) => [...prev, advertId]);
        window.setTimeout(() => {
            removeFromFavorites(advertId);
            setRemovingIds((prev) => prev.filter((id) => id !== advertId));
        }, 200);
    };

    const pageItems = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return favorites.slice(start, start + PAGE_SIZE);
    }, [favorites, page]);

    useEffect(() => {
        setPage(1);
    }, [favorites.length]);

    if (!isAuth) return null;

    const advertsTab = (
        <div>
            {isLoading ? (
                <p className="text-center text-gray-400 py-16">{t("favorites.loading")}</p>
            ) : favorites.length === 0 ? (
                <div className="text-center text-gray-400 py-16">
                    <HeartOutlined className="text-3xl mb-3 block" />
                    {t("favorites.empty")}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
                        {pageItems.map((advert) => (
                            <div
                                key={advert.id}
                                className={`transition-all duration-200 ease-in ${
                                    removingIds.includes(advert.id) ? "opacity-0 scale-95" : "opacity-100 scale-100"
                                }`}
                            >
                                <AdvertCard
                                    advert={advert}
                                    isFavorite
                                    onToggleFavorite={(a) => handleUnfavorite(a.id)}
                                />
                            </div>
                        ))}
                    </div>
                    {favorites.length > PAGE_SIZE && (
                        <div className="flex justify-center mt-8">
                            <Pagination current={page} pageSize={PAGE_SIZE} total={favorites.length} onChange={setPage} showSizeChanger={false} />
                        </div>
                    )}
                </>
            )}
        </div>
    );

    const comingSoonTab = (label: string) => (
        <div className="text-center text-gray-400 py-16">{t("favorites.comingSoon", { label })}</div>
    );

    return (
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-6">
            <h1 className="text-2xl font-bold text-mm-navy mb-6">{t("favorites.title")}</h1>
            <div className="flex flex-col md:flex-row gap-6">
                <AccountSidebar />
                <div className="flex-1 min-w-0 bg-white border border-gray-100 rounded-xl p-4 md:p-6">
                    <Tabs
                        defaultActiveKey="adverts"
                        items={[
                            { key: "adverts", label: <span><HeartOutlined /> {t("favorites.tabs.adverts", { count: favorites.length })}</span>, children: advertsTab },
                            { key: "searches", label: <span><SearchOutlined /> {t("favorites.tabs.searches")}</span>, children: comingSoonTab(t("favorites.savedSearches")) },
                            { key: "sellers", label: <span><ShopOutlined /> {t("favorites.tabs.sellers")}</span>, children: comingSoonTab(t("favorites.favoriteSellers")) },
                        ]}
                    />
                </div>
            </div>
        </div>
    );
};

export default FavoritesPage;
