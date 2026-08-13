import React from "react";
import { useParams, Link } from "react-router-dom";
import { InboxOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useGetAdvertByIdQuery } from "../../../services/advertService";

// /advert/sold/:id — dedicated view for completed/sold listings, linked from the seller
// profile's "Завершені оголошення" section (SellerProfilePage). Shows a vector illustration,
// a clear "already sold" notice, and a way back to the home page — no purchase actions.
const SoldAdvertPage: React.FC = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const advertId = Number(id);
    const { data: advert } = useGetAdvertByIdQuery(advertId, { skip: !advertId });

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-mm-lavender-light px-4 py-16 text-center">
            <div className="w-32 h-32 rounded-full bg-white shadow-lg flex items-center justify-center mb-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                {/* Simple local vector illustration — no remote imagery. */}
                <svg viewBox="0 0 100 100" className="w-16 h-16" aria-hidden="true">
                    <rect x="15" y="35" width="70" height="45" rx="4" fill="#ede7f6" stroke="#7b3fe4" strokeWidth="3" />
                    <path d="M25 35 L35 15 H65 L75 35" fill="none" stroke="#7b3fe4" strokeWidth="3" strokeLinejoin="round" />
                    <line x1="15" y1="52" x2="85" y2="52" stroke="#7b3fe4" strokeWidth="3" />
                    <circle cx="50" cy="66" r="10" fill="#ff8b2d" />
                    <path d="M45 66 L49 70 L56 61" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>

            {advert?.title && (
                <p className="text-xs font-semibold text-mm-purple uppercase tracking-wide mb-2">{advert.title}</p>
            )}

            <div className="flex items-center gap-2 text-gray-400 mb-2">
                <InboxOutlined />
                <span className="text-xs">{t("soldAdvert.advertNumber", { id: advertId || "—" })}</span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-mm-navy mb-3">{t("soldAdvert.title")}</h1>
            <p className="text-sm text-gray-500 max-w-md mb-8">
                {t("soldAdvert.description")}
            </p>

            <Link
                to="/"
                className="bg-mm-purple hover:bg-mm-purple-dark text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl"
            >
                {t("soldAdvert.backToHome")}
            </Link>
        </div>
    );
};

export default SoldAdvertPage;
