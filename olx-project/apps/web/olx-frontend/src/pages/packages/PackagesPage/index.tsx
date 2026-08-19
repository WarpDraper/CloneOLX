import React from "react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import {
    AppstoreOutlined,
    CheckCircleFilled,
    CrownOutlined,
    RocketOutlined,
    ThunderboltFilled,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";

interface LimitPlan {
    key: string;
    limit: number;
    price: number;
    highlighted?: boolean;
}

interface BoostPlan {
    key: string;
    days: number;
    price: number;
    icon: React.ReactNode;
    // Full, static Tailwind class strings (not built via template-literal interpolation —
    // Tailwind's JIT scanner only picks up class names it can see literally in source).
    iconWrapperClassName: string;
}

const LIMIT_PLANS: LimitPlan[] = [
    { key: "limit10", limit: 10, price: 99 },
    { key: "limit20", limit: 20, price: 179, highlighted: true },
    { key: "limit50", limit: 50, price: 399 },
];

const BOOST_PLANS: BoostPlan[] = [
    { key: "fastSale", days: 7, price: 49, icon: <RocketOutlined />, iconWrapperClassName: "bg-mm-purple/10 text-mm-purple" },
    { key: "turbo", days: 30, price: 149, icon: <CrownOutlined />, iconWrapperClassName: "bg-mm-orange/10 text-mm-orange" },
];

// /packages — dedicated, visually polished landing for premium purchases, combining ad-placement
// limit tiers (Option 1) and promotion boosts (Option 2) on a single page instead of the old
// profile-page "Buy Package" button that only linked out to a vague "learn more" blurb. There is
// no real payment gateway anywhere in this app yet (see WalletTopUpModal) — "buying" a package
// here is the same kind of mock confirmation, kept honest via a toast rather than pretending to
// charge a card.
const PackagesPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isAuth } = useSelector((state: RootState) => state.auth);

    const handlePurchase = (planLabel: string) => {
        if (!isAuth) {
            navigate("/login");
            return;
        }
        message.success(t("packagesPage.purchaseSuccess", { plan: planLabel }));
    };

    return (
        <div className="min-h-screen bg-[#f2f4f5]">
            <div className="bg-gradient-to-br from-mm-navy to-mm-purple-dark relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-mm-purple blur-3xl" />
                    <div className="absolute -bottom-16 -right-16 w-80 h-80 rounded-full bg-mm-orange blur-3xl" />
                </div>
                <div className="max-w-5xl mx-auto px-4 md:px-8 py-14 text-center relative z-10">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-5">
                        <CrownOutlined className="text-3xl text-mm-orange" />
                    </div>
                    <h1 className="text-2xl md:text-4xl font-black text-white mb-3">{t("packagesPage.title")}</h1>
                    <p className="text-white/70 text-sm md:text-base max-w-xl mx-auto">{t("packagesPage.subtitle")}</p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 flex flex-col gap-16">
                <section>
                    <div className="flex items-center gap-2 mb-1">
                        <AppstoreOutlined className="text-mm-purple text-lg" />
                        <h2 className="text-xl font-bold text-mm-navy">{t("packagesPage.limits.heading")}</h2>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">{t("packagesPage.limits.description")}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {LIMIT_PLANS.map((plan) => (
                            <div
                                key={plan.key}
                                className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 ${
                                    plan.highlighted
                                        ? "border-mm-purple bg-white shadow-lg"
                                        : "border-gray-200 bg-white shadow-sm hover:shadow-md"
                                }`}
                            >
                                {plan.highlighted && (
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-mm-purple text-white text-[11px] font-bold px-3 py-1 rounded-full">
                                        {t("packagesPage.limits.popular")}
                                    </span>
                                )}
                                <p className="text-4xl font-black text-mm-navy mb-1">{plan.limit}</p>
                                <p className="text-sm text-gray-500 mb-5">{t("packagesPage.limits.activeListings")}</p>
                                <p className="text-2xl font-bold text-mm-navy mb-5">
                                    {t("userProfile.amountCurrency", { amount: plan.price })}
                                    <span className="text-xs font-medium text-gray-400"> {t("packagesPage.perMonth")}</span>
                                </p>
                                <button
                                    type="button"
                                    onClick={() => handlePurchase(t("packagesPage.limits.planLabel", { limit: plan.limit }))}
                                    className={`mt-auto font-bold text-sm px-5 py-2.5 rounded-lg transition-colors ${
                                        plan.highlighted
                                            ? "bg-mm-purple hover:bg-mm-purple-dark text-white"
                                            : "bg-mm-lavender text-mm-purple hover:bg-mm-lavender-light"
                                    }`}
                                >
                                    {t("packagesPage.limits.selectButton")}
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <div className="flex items-center gap-2 mb-1">
                        <ThunderboltFilled className="text-mm-orange text-lg" />
                        <h2 className="text-xl font-bold text-mm-navy">{t("packagesPage.boosts.heading")}</h2>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">{t("packagesPage.boosts.description")}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {BOOST_PLANS.map((plan) => (
                            <div
                                key={plan.key}
                                className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md p-6 transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4 ${plan.iconWrapperClassName}`}>
                                    {plan.icon}
                                </div>
                                <h3 className="text-lg font-bold text-mm-navy mb-1">{t(`packagesPage.boosts.${plan.key}.title`)}</h3>
                                <p className="text-sm text-gray-500 mb-4">{t(`packagesPage.boosts.${plan.key}.description`, { days: plan.days })}</p>

                                <ul className="flex flex-col gap-1.5 mb-5">
                                    {(t(`packagesPage.boosts.${plan.key}.perks`, { returnObjects: true }) as string[]).map((perk) => (
                                        <li key={perk} className="flex items-center gap-2 text-sm text-mm-navy">
                                            <CheckCircleFilled className="text-green-500" /> {perk}
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-auto flex items-center justify-between">
                                    <p className="text-xl font-bold text-mm-navy">
                                        {t("userProfile.amountCurrency", { amount: plan.price })}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => handlePurchase(t(`packagesPage.boosts.${plan.key}.title`))}
                                        className="bg-mm-navy hover:bg-mm-navy/90 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors"
                                    >
                                        {t("packagesPage.boosts.activateButton")}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default PackagesPage;
