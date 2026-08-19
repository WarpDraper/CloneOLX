import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import {
    HeartOutlined,
    HeartFilled,
    MessageOutlined,
    PhoneOutlined,
    EnvironmentOutlined,
    MinusOutlined,
    PlusOutlined,
    CarOutlined,
    FlagOutlined,
    QrcodeOutlined,
} from "@ant-design/icons";
import { Eye } from "lucide-react";
import { Tooltip } from "antd";
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
import ReportModal from "../../../components/common/ReportModal";
import QrCodeModal from "../../../components/advert/QrCodeModal";
import RatingStars from "../../../components/common/RatingStars";
import AdvertCarousel from "../../../components/advert/AdvertCarousel";
import { buildImageUrl, IMAGE_SIZES } from "../../../utils/buildImageUrl";
import { getConditionBadge } from "../../../utils/advertSpecs";

const AdvertDetailsPage: React.FC = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const advertId = Number(id);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isAuth } = useSelector((state: RootState) => state.auth);

    // Статичні пункти доставки — бекенд не має API служби доставки/тарифів,
    // тому це загальні інформаційні варіанти (не прив'язані до конкретного оголошення).
    const DELIVERY_OPTIONS = [
        { label: t("advertDetails.delivery.options.pickupStore.label"), note: t("advertDetails.delivery.options.pickupStore.note"), price: t("advertDetails.delivery.free"), priceClass: "text-green-600" },
        { label: t("advertDetails.delivery.options.pickupNovaPoshta.label"), note: t("advertDetails.delivery.options.pickupNovaPoshta.note"), price: t("advertDetails.delivery.carrierRate"), priceClass: "text-gray-500" },
        { label: t("advertDetails.delivery.options.pickupNovaPoshtaLockers.label"), note: t("advertDetails.delivery.options.pickupNovaPoshtaLockers.note"), price: t("advertDetails.delivery.carrierRate"), priceClass: "text-gray-500" },
        { label: t("advertDetails.delivery.options.courierNovaPoshta.label"), note: "", price: t("advertDetails.delivery.carrierRate"), priceClass: "text-gray-500" },
    ];

    const isValidApiId = Number.isFinite(advertId) && advertId > 0;
    const { data: apiAdvert, isLoading } = useGetAdvertByIdQuery(advertId, { skip: !isValidApiId });
    const advert = apiAdvert;

    const [buyAdvert, { isLoading: isBuying }] = useBuyAdvertMutation();
    const { data: favorites } = useGetFavoritesQuery(undefined, { skip: !isAuth });
    const [addToFavorites] = useAddToFavoritesMutation();
    const [removeFromFavorites] = useRemoveFromFavoritesMutation();
    const [getFiltersByRange, { data: filters }] = useGetFiltersByRangeMutation();

    // Схожі оголошення з тієї ж категорії — POST /api/Advert/get/page (публічний). 8 items = 2
    // pages of the 4-item "Також Вас можуть зацікавити" carousel below. If the API returns none,
    // the carousel section below simply doesn't render (see AdvertCarousel usage) — no
    // placeholder/mock cards.
    const { data: relatedPage } = useGetAdvertsPageQuery(
        { size: 8, page: 1, categoryIds: advert ? [advert.categoryId] : undefined, approved: true },
        { skip: !advert }
    );
    const relatedAdverts = (relatedPage?.items ?? [])
        .filter((a) => a.id !== advertId)
        .slice(0, 8);

    // Інші активні оголошення того ж продавця — окремий 4-item carousel ("Товари продавця")
    // одразу під схожими товарами. Same public /get/page endpoint, filtered by userId
    // (AdvertFilter.UserId) and excluding the advert currently open.
    const { data: sellerPage } = useGetAdvertsPageQuery(
        { size: 8, page: 1, userId: advert?.userId, approved: true },
        { skip: !advert }
    );
    const sellerAdverts = (sellerPage?.items ?? [])
        .filter((a) => a.id !== advertId)
        .slice(0, 8);

    const [quantity, setQuantity] = useState(1);
    const [isSpecsOpen, setIsSpecsOpen] = useState(true);
    const [isPhoneRevealed, setIsPhoneRevealed] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);

    const isFavorite = !!advert && !!favorites?.some((f) => f.id === advert.id);

    useEffect(() => {
        if (advert && advert.filterValues.length > 0) {
            const ids = [...new Set(advert.filterValues.map((f) => f.filterId))];
            getFiltersByRange(ids);
        }
    }, [advert, getFiltersByRange]);

    if (isLoading) {
        return <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-16 text-center text-gray-400">{t("common.loading")}</div>;
    }

    if (!advert) {
        return <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-16 text-center text-gray-400">{t("advertDetails.notFound")}</div>;
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
        dispatch(addNotification({ type: "success", title: t("cart.addedTitle"), message: advert.title }));
    });

    const handleBuy = () => requireAuth(async () => {
        await buyAdvert(advert.id).unwrap();
        dispatch(addNotification({ type: "success", title: t("advertDetails.purchase.successTitle"), message: advert.title }));
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

    const handleReport = () => requireAuth(() => setIsReportModalOpen(true));

    // Resolve each filter id to a human-readable title from the live API result. Falls back to
    // the raw "Характеристика #id" placeholder only if the filter definition isn't loaded yet.
    const conditionBadge = getConditionBadge(advert);
    const characteristicsRows = [
        // Condition ("Стан") goes first — omitted entirely when condition is None (services,
        // pets, real estate, etc. where "new/used" doesn't apply).
        ...(conditionBadge
            ? [{
                key: t("adverts.condition.label"),
                value: conditionBadge.type === "new" ? t("adverts.condition.new") : t("adverts.condition.used"),
            }]
            : []),
        ...advert.filterValues.map((fv) => {
            const filter = filters?.find((f) => f.id === fv.filterId);
            return { key: filter?.name ?? t("advertDetails.unknownCharacteristic", { id: fv.filterId }), value: fv.value };
        }),
    ];

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
                            aria-label={isFavorite ? t("favorites.remove") : t("favorites.add")}
                            className={`shrink-0 w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-mm-lavender transition-colors ${
                                isFavorite ? "text-red-500" : "text-mm-purple"
                            }`}
                        >
                            {isFavorite ? <HeartFilled /> : <HeartOutlined />}
                        </button>
                    </div>

                    <div className="text-xs text-neutral-500 flex items-center gap-4">
                        <span>
                            {t("adverts.details.id")}: {advert.id}
                        </span>
                        <span className="flex items-center gap-1">
                            <Eye size={14} /> {advert.viewCount ?? 0} {t("adverts.details.views")}
                        </span>
                    </div>

                    {advert.user && advert.user.reviewsCount > 0 && (
                        <RatingStars rating={advert.user.rating} reviewsCount={advert.user.reviewsCount} size="sm" />
                    )}

                    <p className="text-2xl font-black text-mm-navy flex items-baseline gap-2 flex-wrap">
                        {advert.price.toLocaleString("uk-UA")} {t("common.currency")}
                        {advert.isContractPrice && (
                            <span className="text-sm font-semibold text-mm-purple">{t("common.negotiable")}</span>
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
                                {t("cart.addToCart")}
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleBuy}
                        disabled={isBuying}
                        className="w-full bg-mm-purple hover:bg-mm-purple-dark text-white font-bold text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isBuying ? t("advertDetails.buy.processing") : t("cart.buy")}
                    </button>

                    {!isAuth && (
                        <div className="bg-[#fdfcde] border border-yellow-100 rounded-lg px-4 py-3 text-xs text-mm-navy">
                            {t("advertDetails.loginPrompt.text")}{" "}
                            <Link to="/login" className="font-semibold underline">
                                {t("advertDetails.loginPrompt.link")}
                            </Link>
                        </div>
                    )}

                    <div className="border border-gray-100 rounded-xl p-4">
                        <p className="text-xs font-medium text-gray-500 mb-3">{t("advertDetails.contactSeller")}</p>
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={handleMessage}
                                className="flex items-center justify-center gap-2 border border-gray-200 text-mm-navy font-medium text-sm py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <MessageOutlined /> {t("advertDetails.messageButton")}
                            </button>
                            <button
                                type="button"
                                onClick={handleShowPhone}
                                className="flex items-center justify-center gap-2 bg-mm-navy/90 text-white font-medium text-sm py-2.5 rounded-lg hover:bg-mm-navy transition-colors"
                            >
                                <PhoneOutlined />
                                {isPhoneRevealed ? advert.phoneNumber || t("advertDetails.notProvided") : t("advertDetails.showPhone")}
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-100/60 rounded-lg p-4">
                        <p className="text-[11px] font-semibold text-gray-500 tracking-wide mb-2">{t("advertDetails.locationLabel")}</p>
                        <div className="flex items-center gap-2 text-sm text-mm-navy">
                            <EnvironmentOutlined className="text-mm-purple" />
                            {advert.settlementName || t("advertDetails.notProvided")}
                        </div>
                    </div>

                    {advert.user && (
                        <div>
                            <SellerWidget seller={advert.user} />
                        </div>
                    )}

                    <div className="flex items-center justify-center gap-4 py-1">
                        <Tooltip title={t("advertDetails.qr.buttonLabel")}>
                            <button
                                type="button"
                                onClick={() => setIsQrModalOpen(true)}
                                aria-label={t("advertDetails.qr.buttonLabel")}
                                className="flex items-center justify-center gap-1.5 text-xs font-medium text-gray-400 hover:text-mm-purple transition-colors"
                            >
                                <QrcodeOutlined />
                            </button>
                        </Tooltip>
                        <span className="text-gray-200">|</span>
                        <button
                            type="button"
                            onClick={handleReport}
                            className="flex items-center justify-center gap-1.5 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <FlagOutlined /> {t("advertDetails.reportButton")}
                        </button>
                    </div>
                </div>
            </div>

            <ReportModal
                open={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                target={{ type: "advert", id: advert.id }}
            />

            <QrCodeModal open={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} />

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 flex flex-col gap-8">
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-bold text-mm-navy">{t("advertDetails.specsTitle")}</h2>
                            <button
                                type="button"
                                onClick={() => setIsSpecsOpen((prev) => !prev)}
                                className="text-xs font-semibold text-mm-purple hover:underline shrink-0"
                            >
                                {isSpecsOpen ? t("advertDetails.hideSpecs") : t("advertDetails.showSpecs")}
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
                        <CarOutlined /> {t("advertDetails.deliveryTitle")}
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
                        <span className="font-bold">{t("advertDetails.paymentInfo.label")}</span> {t("advertDetails.paymentInfo.text")}
                    </p>
                </div>
            </div>

            {/* key={advert.id} resets each carousel's internal page back to 0 when navigating
                between different adverts, instead of e.g. staying on page 2 of a 1-page list. */}
            <AdvertCarousel key={`related-${advert.id}`} title={t("advertDetails.relatedTitle")} adverts={relatedAdverts} itemsPerPage={4} />
            <AdvertCarousel key={`seller-${advert.id}`} title={t("advertDetails.sellerItemsTitle")} adverts={sellerAdverts} itemsPerPage={4} />
        </div>
    );
};

export default AdvertDetailsPage;
