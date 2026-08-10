import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ShoppingCartOutlined, CrownFilled } from "@ant-design/icons";
import type { IAdvert } from "../../types/advert/IAdvert";
import type { RootState } from "../../store";
import { addToCart, removeFromCart } from "../../store/cartSlice";
import { addNotification } from "../../store/notificationSlice";
import { buildImageUrl, IMAGE_SIZES } from "../../utils/buildImageUrl";
import { saveReturnUrl } from "../../utils/returnUrl";
import FallbackImage from "../common/FallbackImage";

interface RecommendationCardProps {
    advert: IAdvert;
}

// Темна картка рекомендацій для головної сторінки (Frame 126, секція "Рекомендації для вас").
const RecommendationCard: React.FC<RecommendationCardProps> = ({ advert }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuth } = useSelector((state: RootState) => state.auth);
    const isInCart = useSelector((state: RootState) => state.cart.items.some((i) => i.advertId === advert.id));

    const cover = [...advert.images].sort((a, b) => a.priority - b.priority)[0];
    const imageUrl = buildImageUrl(cover?.name, IMAGE_SIZES.thumbnail);

    // Неавторизований — запам'ятовуємо сторінку і ведемо на /login замість додавання в кошик;
    // авторизований — перемикаємо стан "у кошику" (додати/прибрати).
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
    };

    return (
        <Link
            to={`/advert/${advert.id}`}
            className="bg-[#272942] border border-white/20 rounded-md p-3 flex flex-col h-full gap-2 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-mm-purple/60 group"
        >
            <div className="relative aspect-square rounded overflow-hidden bg-white/5 shrink-0">
                <FallbackImage
                    src={imageUrl}
                    fallbackKeyword={advert.title}
                    uniqueSeed={advert.id || advert.title}
                    alt={advert.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    placeholder={
                        <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">Немає фото</div>
                    }
                />
                {advert.isTop && (
                    <span className="absolute bottom-1.5 left-1.5 z-10 flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-mm-navy shadow">
                        <CrownFilled /> ТОП
                    </span>
                )}
            </div>
            <h3 className="text-xs font-medium text-white line-clamp-2 leading-snug min-h-[2.25rem]">{advert.title}</h3>
            {/* mt-auto: price/cart row stays pinned to the bottom regardless of how many lines
                the title above wrapped to, so cards line up across the grid row. */}
            <div className="mt-auto flex items-end justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-white">
                        {advert.price.toLocaleString("uk-UA")} грн.
                        {advert.isContractPrice && <span className="ml-1.5 text-xs font-semibold text-mm-purple">Договірна</span>}
                    </p>
                    <p className="text-[10px] font-light text-white/90 leading-tight">
                        {advert.settlementName}
                        <br />
                        {new Date(advert.date).toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                </div>
                {!advert.isContractPrice && (
                    <button
                        type="button"
                        onClick={handleCartClick}
                        aria-label={isInCart ? "Прибрати з кошика" : "Додати в кошик"}
                        aria-pressed={isInCart}
                        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                            isInCart ? "bg-mm-purple text-white" : "bg-white/10 text-white hover:bg-white/20"
                        }`}
                    >
                        <ShoppingCartOutlined className="text-xs" />
                    </button>
                )}
            </div>
        </Link>
    );
};

export default RecommendationCard;
