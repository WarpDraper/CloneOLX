import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { ShoppingCartOutlined, HeartOutlined, HeartFilled, EnvironmentOutlined, CrownFilled } from "@ant-design/icons";
import type { IAdvert } from "../../types/advert/IAdvert";
import type { RootState } from "../../store";
import { addToCart, removeFromCart } from "../../store/cartSlice";
import { addNotification } from "../../store/notificationSlice";
import { buildImageUrl, IMAGE_SIZES } from "../../utils/buildImageUrl";
import { getConditionBadge, getShortSpecs } from "../../utils/advertSpecs";
import { saveReturnUrl } from "../../utils/returnUrl";
import FallbackImage from "../common/FallbackImage";

interface AdvertListItemProps {
    advert: IAdvert;
    // Необов'язковий колбек — викликається ПІСЛЯ успішного додавання в кошик (кнопка кошика
    // авторизацію/додавання/сповіщення тепер обробляє сама).
    onQuickAdd?: (advert: IAdvert) => void;
    onToggleFavorite?: (advert: IAdvert) => void;
    isFavorite?: boolean;
    filterNameById?: Map<number, string>;
}

// Wide horizontal card for CategoryListingPage's list view mode: image on the left, full
// (non-truncated) title, inline short specs, price top-right. Mirrors AdvertCard's data/props
// so the listing page can swap between grid and list without touching its data-fetching logic.
const AdvertListItem: React.FC<AdvertListItemProps> = ({ advert, onQuickAdd, onToggleFavorite, isFavorite, filterNameById }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuth } = useSelector((state: RootState) => state.auth);
    const isInCart = useSelector((state: RootState) => state.cart.items.some((i) => i.advertId === advert.id));
    const [heartPulsing, setHeartPulsing] = useState(false);

    const cover = [...advert.images].sort((a, b) => a.priority - b.priority)[0];
    const imageUrl = buildImageUrl(cover?.name, IMAGE_SIZES.card);
    const conditionBadge = getConditionBadge(advert, filterNameById);
    const shortSpecs = getShortSpecs(advert, filterNameById);

    const handleCartClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuth) {
            saveReturnUrl(`${location.pathname}${location.search}`);
            navigate("/login");
            return;
        }

        if (isInCart) {
            dispatch(removeFromCart(advert.id));
            return;
        }

        dispatch(addToCart({ advertId: advert.id, title: advert.title, price: advert.price, image: imageUrl }));
        dispatch(addNotification({ type: "success", title: t("cart.addedTitle"), message: advert.title }));
        onQuickAdd?.(advert);
    };

    return (
        <Link
            to={`/advert/${advert.id}`}
            className="relative flex gap-4 bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group p-3"
        >
            <div className="relative shrink-0 w-40 sm:w-48 aspect-[4/3] overflow-hidden rounded-xl bg-neutral-900">
                {conditionBadge && (
                    <span
                        className={`absolute top-2 left-2 z-10 text-[10px] font-semibold px-2 py-1 rounded-full ${
                            conditionBadge.type === "new"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50"
                                : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                        }`}
                    >
                        {conditionBadge.type === "new" ? t("adverts.condition.new") : t("adverts.condition.used")}
                    </span>
                )}
                <FallbackImage
                    src={imageUrl}
                    fallbackKeyword={advert.title}
                    uniqueSeed={advert.id || advert.title}
                    alt={advert.title}
                    className="w-full h-full object-cover object-center scale-105 group-hover:scale-110 transition-transform duration-300"
                    placeholder={
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">{t("advertCard.noPhoto")}</div>
                    }
                />
                {advert.isTop && (
                    <span className="absolute bottom-2 left-2 z-10 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-mm-navy shadow">
                        <CrownFilled /> {t("advertCard.top")}
                    </span>
                )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-mm-navy leading-snug">{advert.title}</h3>
                    <div className="shrink-0 flex items-center gap-2">
                        <p className="text-base font-bold text-mm-navy whitespace-nowrap">
                            {advert.price.toLocaleString("uk-UA")} {t("common.currency")}
                            {advert.isContractPrice && <span className="ml-1.5 text-xs font-semibold text-mm-purple">{t("common.negotiable")}</span>}
                        </p>
                        {onToggleFavorite && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    if (!isAuth) {
                                        saveReturnUrl(`${location.pathname}${location.search}`);
                                        navigate("/login");
                                        return;
                                    }

                                    onToggleFavorite(advert);
                                    setHeartPulsing(true);
                                    window.setTimeout(() => setHeartPulsing(false), 200);
                                }}
                                aria-label={isFavorite ? t("favorites.remove") : t("favorites.add")}
                                className={`w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-mm-lavender ${
                                    isFavorite ? "text-red-500" : "text-mm-purple"
                                }`}
                            >
                                <span className={`inline-flex transition-transform duration-200 ${heartPulsing ? "scale-125" : "scale-100"}`}>
                                    {isFavorite ? <HeartFilled /> : <HeartOutlined />}
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {shortSpecs.length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                        {shortSpecs.map((spec) => (
                            <span key={spec.key} className="flex items-center gap-1 text-xs text-gray-500">
                                <spec.icon />
                                {spec.label}
                            </span>
                        ))}
                    </div>
                )}

                <p className="text-sm text-gray-600 line-clamp-2 mt-2">{advert.description}</p>

                <div className="mt-auto pt-2 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1 text-xs text-gray-500 truncate">
                        <EnvironmentOutlined /> {advert.settlementName}
                    </span>
                    {!advert.isContractPrice && (
                        <button
                            type="button"
                            onClick={handleCartClick}
                            aria-pressed={isInCart}
                            className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                                isInCart ? "bg-mm-purple text-white hover:bg-mm-purple-dark" : "bg-mm-navy text-white hover:bg-mm-navy/90"
                            }`}
                        >
                            <ShoppingCartOutlined /> {isInCart ? t("cart.inCart") : t("cart.buy")}
                        </button>
                    )}
                </div>
            </div>
        </Link>
    );
};

export default AdvertListItem;
