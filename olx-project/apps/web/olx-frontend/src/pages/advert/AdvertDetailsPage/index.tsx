import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
    HeartOutlined,
    HeartFilled,
    MessageOutlined,
    PhoneOutlined,
    EnvironmentOutlined,
    MinusOutlined,
    PlusOutlined,
    CarOutlined,
} from "@ant-design/icons";
import type { RootState } from "../../../store";
import { useGetAdvertByIdQuery, useBuyAdvertMutation, useGetAdvertsPageQuery } from "../../../services/advertService";
import {
    useGetFavoritesQuery,
    useAddToFavoritesMutation,
    useRemoveFromFavoritesMutation,
} from "../../../services/accountService";
import { useGetFiltersByRangeMutation } from "../../../services/filterService";
import { addToCart } from "../../../store/cartSlice";
import { addNotification } from "../../../store/notificationSlice";
import AdvertGallery from "../../../components/advert/AdvertGallery";
import SellerWidget from "../../../components/advert/SellerWidget";
import RatingStars from "../../../components/common/RatingStars";
import AdvertCard from "../../../components/advert/AdvertCard";
import { buildImageUrl, IMAGE_SIZES } from "../../../utils/buildImageUrl";
import { getSeedAdverts, getSeedFilters } from "../../../utils/seedHydration";

// Статичні пункти доставки — бекенд не має API служби доставки/тарифів,
// тому це загальні інформаційні варіанти (не прив'язані до конкретного оголошення).
const DELIVERY_OPTIONS = [
    { label: "Самовивіз з магазинів MultiMart", note: "Середній термін доставки 3 дні", price: "Безкоштовно", priceClass: "text-green-600" },
    { label: "Самовивіз з Нової Пошти", note: "Середній термін доставки 2 дні", price: "Тариф перевізника", priceClass: "text-gray-500" },
    { label: "Самовивіз з поштоматів Нової Пошти", note: "Середній термін доставки 2 дні", price: "Тариф перевізника", priceClass: "text-gray-500" },
    { label: "Кур'єр Нової Пошти", note: "", price: "Тариф перевізника", priceClass: "text-gray-500" },
];

const AdvertDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const advertId = Number(id);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isAuth } = useSelector((state: RootState) => state.auth);

    // Seed-hydrated adverts use synthetic negative ids (see utils/seedHydration.ts) — never
    // issue a real API request for those (backend rejects e.g. GET /api/Advert/get/-2149 with 400).
    const isValidApiId = Number.isFinite(advertId) && advertId > 0;
    const { data: apiAdvert, isLoading, isError } = useGetAdvertByIdQuery(advertId, { skip: !isValidApiId });

    // Фолбек на локальні seed-дані (adverts.seed.json), якщо C# API повернуло помилку/порожньо
    // (offline dev / щойно піднята БД) — не застосовується, поки триває реальний запит.
    const usingSeedFallback = !isValidApiId || (!isLoading && (isError || !apiAdvert));
    const seedAdvert = useMemo(
        () => (usingSeedFallback ? getSeedAdverts().find((a) => a.id === advertId) : undefined),
        [usingSeedFallback, advertId]
    );
    const advert = apiAdvert ?? seedAdvert;

    const [buyAdvert, { isLoading: isBuying }] = useBuyAdvertMutation();
    const { data: favorites } = useGetFavoritesQuery(undefined, { skip: !isAuth });
    const [addToFavorites] = useAddToFavoritesMutation();
    const [removeFromFavorites] = useRemoveFromFavoritesMutation();
    const [getFiltersByRange, { data: filters }] = useGetFiltersByRangeMutation();

    // Схожі оголошення з тієї ж категорії — POST /api/Advert/get/page (публічний),
    // або з seed-даних, якщо саме оголошення теж прийшло з фолбека.
    const { data: relatedPage } = useGetAdvertsPageQuery(
        { size: 8, page: 1, categoryIds: advert ? [advert.categoryId] : undefined, approved: true },
        { skip: !advert || usingSeedFallback }
    );
    const seedRelatedAdverts = useMemo(
        () =>
            usingSeedFallback && advert
                ? getSeedAdverts().filter((a) => a.categoryId === advert.categoryId && a.id !== advert.id)
                : [],
        [usingSeedFallback, advert]
    );
    const relatedAdverts = (usingSeedFallback ? seedRelatedAdverts : relatedPage?.items ?? [])
        .filter((a) => a.id !== advertId)
        .slice(0, 8);

    const [quantity, setQuantity] = useState(1);
    const [isSpecsOpen, setIsSpecsOpen] = useState(true);
    const [isPhoneRevealed, setIsPhoneRevealed] = useState(false);

    const isFavorite = !!advert && !!favorites?.some((f) => f.id === advert.id);

    useEffect(() => {
        if (advert && advert.filterValues.length > 0) {
            const ids = [...new Set(advert.filterValues.map((f) => f.filterId))];
            getFiltersByRange(ids);
        }
    }, [advert, getFiltersByRange]);

    if (isLoading) {
        return <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-16 text-center text-gray-400">Завантаження...</div>;
    }

    if (!advert) {
        return <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-16 text-center text-gray-400">Оголошення не знайдено.</div>;
    }

    const requireAuth = (action: () => void) => {
        if (!isAuth) {
            navigate("/login");
            return;
        }
        action();
    };

    // Was missing the auth check other "add to cart" entry points already have — unauthenticated
    // users must never get the item added or the "Додано в кошик" toast, just a redirect.
    const handleAddToCart = () => requireAuth(() => {
        const cover = [...advert.images].sort((a, b) => a.priority - b.priority)[0];
        dispatch(addToCart({
            advertId: advert.id,
            title: advert.title,
            price: advert.price,
            image: buildImageUrl(cover?.name, IMAGE_SIZES.thumbnail),
            quantity,
        }));
        dispatch(addNotification({ type: "success", title: "Додано в кошик", message: advert.title }));
    });

    const handleBuy = () => requireAuth(async () => {
        await buyAdvert(advert.id).unwrap();
        dispatch(addNotification({ type: "success", title: "Купівля оформлена", message: advert.title }));
    });

    const handleToggleFavorite = () => requireAuth(async () => {
        if (isFavorite) {
            await removeFromFavorites(advert.id).unwrap();
        } else {
            await addToFavorites(advert.id).unwrap();
        }
    });

    const handleMessage = () => requireAuth(() => navigate(`/chat?advertId=${advert.id}`));

    const handleShowPhone = () => requireAuth(() => setIsPhoneRevealed(true));

    // Resolve each filter id to a human-readable title. Prefer the live API result
    // (`filters`, fetched by id above); when that's empty/unavailable (offline dev, or the
    // advert itself came from the seed fallback and carries synthetic filter ids the real API
    // can't resolve), fall back to the local filters.seed.json catalogue by id. Only as a last
    // resort do we fall back to the raw "Характеристика #id" placeholder.
    const characteristicsRows = advert.filterValues.map((fv) => {
        const filter = filters?.find((f) => f.id === fv.filterId);
        const seedFilter = !filter ? getSeedFilters().find((f) => f.id === fv.filterId) : undefined;
        return { key: filter?.name ?? seedFilter?.name ?? `Характеристика #${fv.filterId}`, value: fv.value };
    });

    return (
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <AdvertGallery images={advert.images} title={advert.title} />
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                        <h1 className="text-xl font-bold text-mm-navy leading-snug">{advert.title}</h1>
                        <button
                            type="button"
                            onClick={handleToggleFavorite}
                            aria-label={isFavorite ? "Прибрати з обраного" : "Додати в обране"}
                            className={`shrink-0 w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-mm-lavender transition-colors ${
                                isFavorite ? "text-red-500" : "text-mm-purple"
                            }`}
                        >
                            {isFavorite ? <HeartFilled /> : <HeartOutlined />}
                        </button>
                    </div>

                    {advert.user && advert.user.reviewsCount > 0 && (
                        <RatingStars rating={advert.user.rating} reviewsCount={advert.user.reviewsCount} size="sm" />
                    )}

                    <p className="text-2xl font-black text-mm-navy flex items-baseline gap-2 flex-wrap">
                        {advert.price.toLocaleString("uk-UA")} грн.
                        {advert.isContractPrice && (
                            <span className="text-sm font-semibold text-mm-purple">Договірна</span>
                        )}
                    </p>

                    {!advert.isContractPrice && (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    className="w-9 h-9 flex items-center justify-center text-mm-navy hover:bg-gray-50"
                                >
                                    <MinusOutlined />
                                </button>
                                <span className="w-10 text-center font-semibold text-mm-navy">{quantity}</span>
                                <button
                                    type="button"
                                    onClick={() => setQuantity((q) => q + 1)}
                                    className="w-9 h-9 flex items-center justify-center text-mm-navy hover:bg-gray-50"
                                >
                                    <PlusOutlined />
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddToCart}
                                className="flex-1 bg-mm-navy hover:bg-mm-navy/90 text-white font-bold text-sm py-2.5 rounded-lg transition-colors"
                            >
                                Додати в кошик
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleBuy}
                        disabled={isBuying}
                        className="w-full bg-mm-purple hover:bg-mm-purple-dark text-white font-bold text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isBuying ? "Обробка..." : "Купити"}
                    </button>

                    {!isAuth && (
                        <div className="bg-[#fdfcde] border border-yellow-100 rounded-lg px-4 py-3 text-xs text-mm-navy">
                            Увійдіть у свій профіль MultiMart або створіть новий, щоб зв'язатися з продавцем.{" "}
                            <Link to="/login" className="font-semibold underline">
                                Увійдіть або створіть профіль
                            </Link>
                        </div>
                    )}

                    <div className="border border-gray-100 rounded-xl p-4">
                        <p className="text-xs font-medium text-gray-500 mb-3">Зв'язок з продавцем:</p>
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={handleMessage}
                                className="flex items-center justify-center gap-2 border border-gray-200 text-mm-navy font-medium text-sm py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <MessageOutlined /> Повідомлення
                            </button>
                            <button
                                type="button"
                                onClick={handleShowPhone}
                                className="flex items-center justify-center gap-2 bg-mm-navy/90 text-white font-medium text-sm py-2.5 rounded-lg hover:bg-mm-navy transition-colors"
                            >
                                <PhoneOutlined />
                                {isPhoneRevealed ? advert.phoneNumber || "не вказано" : "Телефон"}
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-100/60 rounded-lg p-4">
                        <p className="text-[11px] font-semibold text-gray-500 tracking-wide mb-2">МІСЦЕЗНАХОДЖЕННЯ</p>
                        <div className="flex items-center gap-2 text-sm text-mm-navy">
                            <EnvironmentOutlined className="text-mm-purple" />
                            {advert.settlementName || "не вказано"}
                        </div>
                    </div>

                    {advert.user && (
                        <div>
                            <SellerWidget seller={advert.user} />
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 flex flex-col gap-8">
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-bold text-mm-navy">Характеристика та опис</h2>
                            <button
                                type="button"
                                onClick={() => setIsSpecsOpen((prev) => !prev)}
                                className="text-xs font-semibold text-mm-purple hover:underline shrink-0"
                            >
                                {isSpecsOpen ? "Приховати опис та характеристики" : "Показати опис та характеристики"}
                            </button>
                        </div>
                        {isSpecsOpen && (
                            <>
                                {characteristicsRows.length > 0 && (
                                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mb-4">
                                        {characteristicsRows.map((row, i) => (
                                            <div key={i} className="flex justify-between border-b border-gray-100 py-1.5 text-sm">
                                                <dt className="text-gray-500">{row.key}</dt>
                                                <dd className="text-mm-navy font-medium">{row.value}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                )}
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{advert.description}</p>
                            </>
                        )}
                    </section>
                </div>

                <div className="bg-[#fdfcde] rounded-lg p-5">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-mm-navy mb-4">
                        <CarOutlined /> Доставка та оплата
                    </h3>
                    <div className="flex flex-col gap-3 mb-4">
                        {DELIVERY_OPTIONS.map((option) => (
                            <div key={option.label} className="flex items-center justify-between gap-3 bg-white rounded-md px-3 py-2.5 border border-black/5">
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-mm-navy leading-snug">{option.label}</p>
                                    {option.note && <p className="text-[10px] text-gray-500 mt-0.5">{option.note}</p>}
                                </div>
                                <span className={`text-[10px] font-semibold shrink-0 ${option.priceClass}`}>{option.price}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-gray-600 leading-relaxed">
                        <span className="font-bold">Оплата.</span> Оплата під час отримання товару, Apple Pay, Google Pay,
                        оплата карткою Visa/MasterCard (MultiMart), оплата на рахунок продавця.
                    </p>
                </div>
            </div>

            {relatedAdverts.length > 0 && (
                <section className="mt-12">
                    <h2 className="text-xl font-bold text-mm-navy mb-5">Також Вас можуть зацікавити</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {relatedAdverts.map((related) => (
                            <AdvertCard key={related.id} advert={related} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default AdvertDetailsPage;
