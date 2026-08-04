import React, { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { UserOutlined, MessageOutlined, CalendarOutlined } from "@ant-design/icons";
import { useGetSellerProfileQuery } from "../../../services/profileService";
import { useGetAdvertsByRangeMutation } from "../../../services/advertService";
import { buildImageUrl, IMAGE_SIZES } from "../../../utils/buildImageUrl";
import RatingStars from "../../../components/common/RatingStars";
import OnlineStatusBadge from "../../../components/common/OnlineStatusBadge";
import AdvertCard from "../../../components/advert/AdvertCard";

const SellerProfilePage: React.FC = () => {
    const { sellerId } = useParams<{ sellerId: string }>();
    const id = Number(sellerId);
    const navigate = useNavigate();

    const { data: seller, isLoading, isError } = useGetSellerProfileQuery(id, { skip: !id });
    const [getAdvertsByRange, { data: adverts, isLoading: isAdvertsLoading }] = useGetAdvertsByRangeMutation();

    useEffect(() => {
        if (seller && seller.adverts.length > 0) {
            getAdvertsByRange(seller.adverts);
        }
    }, [seller, getAdvertsByRange]);

    if (isLoading) {
        return <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-16 text-center text-gray-400">Завантаження...</div>;
    }

    if (isError || !seller) {
        return <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-16 text-center text-gray-400">Профіль не знайдено.</div>;
    }

    const displayName = [seller.firstName, seller.lastName].filter(Boolean).join(" ") || "Продавець";
    const avatarUrl = buildImageUrl(seller.photo, IMAGE_SIZES.avatarLarge);
    const activeAdverts = (adverts ?? []).filter((a) => a.approved && !a.blocked && !a.completed);
    const registeredDate = new Date(seller.createdDate).toLocaleDateString("uk-UA", { year: "numeric", month: "long" });

    return (
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-8">
            <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col sm:flex-row sm:items-center gap-6 mb-8">
                <div className="w-24 h-24 rounded-full bg-mm-lavender flex items-center justify-center overflow-hidden shrink-0">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                        <UserOutlined className="text-mm-purple text-3xl" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-mm-navy mb-1">{displayName}</h1>
                    <div className="flex flex-wrap items-center gap-4 mb-2">
                        <RatingStars rating={seller.rating} reviewsCount={seller.reviewsCount} />
                        <OnlineStatusBadge lastActivity={seller.lastActivity} />
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
                    className="flex items-center justify-center gap-2 bg-mm-purple hover:bg-mm-purple-dark text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-colors shrink-0"
                >
                    <MessageOutlined /> Написати продавцю
                </button>
            </div>

            <h2 className="text-lg font-bold text-mm-navy mb-4">Оголошення продавця</h2>

            {isAdvertsLoading ? (
                <div className="text-center text-gray-400 py-10">Завантаження оголошень...</div>
            ) : activeAdverts.length === 0 ? (
                <div className="text-center text-gray-400 py-10">У продавця немає активних оголошень.</div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {activeAdverts.map((advert) => (
                        <AdvertCard key={advert.id} advert={advert} />
                    ))}
                </div>
            )}

            <div className="mt-6">
                <Link to="/" className="text-sm text-mm-purple hover:underline">
                    ← На головну
                </Link>
            </div>
        </div>
    );
};

export default SellerProfilePage;
