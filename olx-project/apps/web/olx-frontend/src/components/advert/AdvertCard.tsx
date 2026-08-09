import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ShoppingCartOutlined, HeartOutlined, HeartFilled } from "@ant-design/icons";
import type { IAdvert } from "../../types/advert/IAdvert";
import type { RootState } from "../../store";
import { addToCart, removeFromCart } from "../../store/cartSlice";
import { addNotification } from "../../store/notificationSlice";
import { buildImageUrl, IMAGE_SIZES } from "../../utils/buildImageUrl";
import { getConditionLabel, getShortSpecs } from "../../utils/advertSpecs";
import { saveReturnUrl } from "../../utils/returnUrl";
import FallbackImage from "../common/FallbackImage";

interface AdvertCardProps {
    advert: IAdvert;
    // Необов'язковий колбек — викликається ПІСЛЯ успішного додавання в кошик (кнопка кошика
    // авторизацію/додавання/сповіщення тепер обробляє сама, це лише додатковий хук за потреби).
    onQuickAdd?: (advert: IAdvert) => void;
    onToggleFavorite?: (advert: IAdvert) => void;
    isFavorite?: boolean;
    // filterId -> name, коли викликач (наприклад CategoryListingPage) вже завантажив фасети
    // категорії — дозволяє резолвити короткі характеристики без додаткового запиту.
    filterNameById?: Map<number, string>;
}

const AdvertCard: React.FC<AdvertCardProps> = ({ advert, onQuickAdd, onToggleFavorite, isFavorite, filterNameById }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuth } = useSelector((state: RootState) => state.auth);
    const isInCart = useSelector((state: RootState) => state.cart.items.some((i) => i.advertId === advert.id));

    const cover = [...advert.images].sort((a, b) => a.priority - b.priority)[0];
    const imageUrl = buildImageUrl(cover?.name, IMAGE_SIZES.card);
    const condition = getConditionLabel(advert, filterNameById);
    const shortSpecs = getShortSpecs(advert, filterNameById);

    // Неавторизований — не додаємо в кошик, запам'ятовуємо поточну сторінку і ведемо на /login;
    // авторизований — перемикаємо стан "у кошику" (додати/прибрати), як обране-серце поруч.
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
        dispatch(addNotification({ type: "success", title: "Додано в кошик", message: advert.title }));
        onQuickAdd?.(advert);
    };

    return (
        <Link
            to={`/advert/${advert.id}`}
            className="relative bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-mm-purple/30 group flex flex-col h-full"
        >
            {onToggleFavorite && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleFavorite(advert);
                    }}
                    aria-label={isFavorite ? "Прибрати з обраного" : "Додати в обране"}
                    className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white ${
                        isFavorite ? "text-red-500" : "text-mm-purple"
                    }`}
                >
                    {isFavorite ? <HeartFilled /> : <HeartOutlined />}
                </button>
            )}
            {condition && (
                <span
                    className={`absolute top-2 left-2 z-10 text-[10px] font-semibold px-2 py-1 rounded-full ${
                        condition === "Новий" ? "bg-green-600 text-white" : "bg-white/90 text-mm-navy"
                    }`}
                >
                    {condition}
                </span>
            )}
            <div className="h-[180px] w-full overflow-hidden bg-gray-100 shrink-0">
                <FallbackImage
                    src={imageUrl}
                    fallbackKeyword={advert.title}
                    uniqueSeed={advert.id || advert.title}
                    alt={advert.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    placeholder={
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Немає фото</div>
                    }
                />
            </div>
            {/* flex-1 + mt-auto on the price row below: title/specs can wrap to 1-2 lines without
                shifting the price/cart-button line out of alignment with sibling cards in the row. */}
            <div className="p-3 flex flex-col flex-1">
                <h3 className="text-sm font-semibold text-mm-navy line-clamp-2 mb-1 leading-snug min-h-[2.5rem]">{advert.title}</h3>
                {shortSpecs.length > 0 && (
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mb-1.5">
                        {shortSpecs.map((spec) => (
                            <span key={spec.key} className="flex items-center gap-1 text-[11px] text-gray-500">
                                <spec.icon />
                                {spec.label}
                            </span>
                        ))}
                    </div>
                )}
                <div className="flex items-end justify-between gap-2 mt-auto pt-1.5">
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-mm-navy mb-1">
                            {advert.price.toLocaleString("uk-UA")} грн.
                            {advert.isContractPrice && <span className="ml-1.5 text-xs font-semibold text-mm-purple">Договірна</span>}
                        </p>
                        <p className="text-xs text-gray-500 leading-tight truncate">{advert.settlementName}</p>
                    </div>
                    {!advert.isContractPrice && (
                        <button
                            type="button"
                            onClick={handleCartClick}
                            aria-label={isInCart ? "Прибрати з кошика" : "Додати в кошик"}
                            aria-pressed={isInCart}
                            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                isInCart ? "bg-mm-purple text-white hover:bg-mm-purple-dark" : "bg-mm-navy text-white hover:bg-mm-navy/90"
                            }`}
                        >
                            <ShoppingCartOutlined className="text-xs" />
                        </button>
                    )}
                </div>
            </div>
        </Link>
    );
};

export default AdvertCard;
