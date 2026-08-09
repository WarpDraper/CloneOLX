import React, { useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { UserOutlined, MessageOutlined, CalendarOutlined, StarFilled, CommentOutlined } from "@ant-design/icons";
import { useGetSellerProfileQuery, isRealUserId } from "../../../services/profileService";
import { useGetAdvertsByRangeMutation } from "../../../services/advertService";
import { buildImageUrl, IMAGE_SIZES } from "../../../utils/buildImageUrl";
import FallbackImage from "../../../components/common/FallbackImage";
import { findSeedSellerById } from "../../../utils/seedHydration";
import type { ISellerProfile } from "../../../types/user/ISellerProfile";
import type { IAdvert } from "../../../types/advert/IAdvert";
import RatingStars from "../../../components/common/RatingStars";
import OnlineStatusBadge from "../../../components/common/OnlineStatusBadge";
import AdvertCard from "../../../components/advert/AdvertCard";

// Completed/sold listing tile — same information as AdvertCard but rendered in a distinct
// grayscale style and routed to the dedicated "Sold" view instead of the live advert page.
const SoldListingTile: React.FC<{ advert: IAdvert }> = ({ advert }) => {
    const cover = [...advert.images].sort((a, b) => a.priority - b.priority)[0];
    const imageUrl = buildImageUrl(cover?.name, IMAGE_SIZES.card);

    return (
        <Link
            to={`/advert/sold/${advert.id}`}
            className="relative bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col h-full"
            style={{ filter: "grayscale(100%) opacity(0.65)" }}
        >
            <span className="absolute top-2 left-2 z-10 text-[10px] font-semibold px-2 py-1 rounded-full bg-mm-navy text-white">
                Продано
            </span>
            <div className="h-[180px] w-full overflow-hidden bg-gray-100 shrink-0">
                <FallbackImage
                    src={imageUrl}
                    fallbackKeyword={advert.title}
                    uniqueSeed={advert.id || advert.title}
                    alt={advert.title}
                    className="w-full h-full object-cover"
                    placeholder={
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Немає фото</div>
                    }
                />
            </div>
            <div className="p-3 flex flex-col flex-1">
                <h3 className="text-sm font-semibold text-mm-navy line-clamp-2 mb-1 leading-snug min-h-[2.5rem]">{advert.title}</h3>
                <p className="text-sm font-bold text-mm-navy mt-auto pt-1.5">
                    {advert.price.toLocaleString("uk-UA")} грн.
                </p>
            </div>
        </Link>
    );
};

const SellerProfilePage: React.FC = () => {
    const { sellerId } = useParams<{ sellerId: string }>();
    const id = Number(sellerId);
    const navigate = useNavigate();

    // Seed-hydrated sellers (see UserHomePage) use synthetic negative ids — never issue a real
    // API request for those (backend rejects e.g. GET /api/User/get/-1747 with 400 Bad Request).
    const isValidApiId = isRealUserId(id);
    const { data: apiSeller, isLoading, isError } = useGetSellerProfileQuery(id, { skip: !isValidApiId });

    // Fall back to the local seed seller instead — same fields the UI needs, just no linked
    // adverts (seed adverts aren't reliably attributable back to a synthetic seller id).
    const seedSeller = useMemo(() => (isValidApiId ? undefined : findSeedSellerById(id)), [isValidApiId, id]);
    const seller: ISellerProfile | undefined = apiSeller ?? (seedSeller && {
        ...seedSeller,
        emailConfirmed: true,
        phoneNumberConfirmed: true,
        twoFactorEnabled: false,
        about: null,
        settlementRef: null,
        adverts: [],
        favoriteAdverts: [],
    });

    const [getAdvertsByRange, { data: adverts, isLoading: isAdvertsLoading }] = useGetAdvertsByRangeMutation();

    useEffect(() => {
        if (seller && seller.adverts.length > 0) {
            getAdvertsByRange(seller.adverts);
        }
    }, [seller, getAdvertsByRange]);

    if (isLoading && isValidApiId) {
        return <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-16 text-center text-gray-400">Завантаження...</div>;
    }

    if (isError || !seller) {
        return <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-16 text-center text-gray-400">Профіль не знайдено.</div>;
    }

    const displayName = [seller.firstName, seller.lastName].filter(Boolean).join(" ") || "Продавець";
    const avatarUrl = buildImageUrl(seller.photo, IMAGE_SIZES.avatarLarge);
    const activeAdverts = (adverts ?? []).filter((a) => a.approved && !a.blocked && !a.completed);
    const completedAdverts = (adverts ?? []).filter((a) => a.completed && !a.blocked);
    const registeredDate = new Date(seller.createdDate).toLocaleDateString("uk-UA", { year: "numeric", month: "long" });

    return (
        <div className="min-h-screen flex flex-col">
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-8 flex-1 w-full">
            <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col sm:flex-row sm:items-center gap-6 mb-8 shadow-sm">
                <div className="w-24 h-24 rounded-full bg-mm-lavender flex items-center justify-center overflow-hidden shrink-0">
                    <FallbackImage
                        src={avatarUrl}
                        fallbackKeyword={displayName}
                        uniqueSeed={id}
                        alt={displayName}
                        className="w-full h-full object-cover"
                        placeholder={<UserOutlined className="text-mm-purple text-3xl" />}
                    />
                </div>

                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-mm-navy mb-1">{displayName}</h1>
                    <div className="flex flex-wrap items-center gap-4 mb-2">
                        <RatingStars rating={seller.rating} reviewsCount={seller.reviewsCount} />
                        <OnlineStatusBadge userId={seller.id} isOnline={seller.isOnline} lastSeen={seller.lastSeen} />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                            <CalendarOutlined /> На сайті з {registeredDate}
                        </span>
                        <span>Активних оголошень: {activeAdverts.length}</span>
                        {seller.settlementDescrption && <span>{seller.settlementDescrption}</span>}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => navigate(`/chat?sellerId=${seller.id}`)}
                    className="flex items-center justify-center gap-2 bg-mm-purple hover:bg-mm-purple-dark text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-all duration-300 hover:-translate-y-1 shrink-0"
                >
                    <MessageOutlined /> Написати продавцю
                </button>
            </div>

            {/* 1. Buyer reviews — summarized from the seller's real rating/reviewsCount fields
                (no fabricated per-review text: the backend has no reviews endpoint yet). */}
            <section className="mb-10">
                <h2 className="text-lg font-bold text-mm-navy mb-4">Відгуки покупців</h2>
                <div className="bg-mm-lavender-light border border-purple-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                    {seller.reviewsCount > 0 ? (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                            <div className="flex flex-col items-center sm:items-start shrink-0">
                                <span className="text-4xl font-bold text-mm-navy leading-none">{seller.rating.toFixed(1)}</span>
                                <RatingStars rating={seller.rating} reviewsCount={seller.reviewsCount} size="sm" />
                            </div>
                            <div className="flex-1 text-sm text-gray-600 leading-relaxed">
                                <StarFilled className="text-mm-orange mr-1.5" />
                                На основі {seller.reviewsCount}{" "}
                                {seller.reviewsCount === 1 ? "відгуку" : "відгуків"} покупців MultiMart.
                                Детальні тексти відгуків з'являться тут найближчим часом.
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                            <CommentOutlined className="text-xl text-mm-purple" />
                            У цього продавця ще немає відгуків покупців.
                        </div>
                    )}
                </div>
            </section>

            {/* 2. Active listings */}
            <section className="mb-10">
                <h2 className="text-lg font-bold text-mm-navy mb-4">Активні оголошення</h2>
                {isAdvertsLoading ? (
                    <div className="text-center text-gray-400 py-10">Завантаження оголошень...</div>
                ) : activeAdverts.length === 0 ? (
                    <div className="text-center text-gray-400 py-10">У продавця немає активних оголошень.</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-stretch">
                        {activeAdverts.map((advert) => (
                            <AdvertCard key={advert.id} advert={advert} />
                        ))}
                    </div>
                )}
            </section>

            {/* 3. Completed/sold listings — grayscale tiles routed to the dedicated "Sold" view. */}
            {!isAdvertsLoading && completedAdverts.length > 0 && (
                <section className="mb-10">
                    <h2 className="text-lg font-bold text-mm-navy mb-4">Завершені оголошення</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-stretch">
                        {completedAdverts.map((advert) => (
                            <SoldListingTile key={advert.id} advert={advert} />
                        ))}
                    </div>
                </section>
            )}

            <div className="mt-6">
                <Link to="/" className="text-sm text-mm-purple hover:underline">
                    ← На головну
                </Link>
            </div>
        </div>
        </div>
    );
};

export default SellerProfilePage;
