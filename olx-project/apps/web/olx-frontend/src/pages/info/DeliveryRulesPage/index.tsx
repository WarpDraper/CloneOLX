import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    CarOutlined,
    ShopOutlined,
    HomeOutlined,
    CreditCardOutlined,
    ClockCircleOutlined,
    StopOutlined,
    FileTextOutlined,
    SafetyOutlined,
} from "@ant-design/icons";

interface MethodCard {
    icon: React.ComponentType;
    title: string;
    text: string;
}

const DeliveryRulesPage: React.FC = () => {
    const { t } = useTranslation();

    const DELIVERY_METHODS: MethodCard[] = [
        {
            icon: CarOutlined,
            title: t("deliveryRules.methods.novaPoshta.title"),
            text: t("deliveryRules.methods.novaPoshta.text"),
        },
        {
            icon: ShopOutlined,
            title: t("deliveryRules.methods.selfPickup.title"),
            text: t("deliveryRules.methods.selfPickup.text"),
        },
        {
            icon: HomeOutlined,
            title: t("deliveryRules.methods.courier.title"),
            text: t("deliveryRules.methods.courier.text"),
        },
    ];

    const PAYMENT_METHODS: MethodCard[] = [
        {
            icon: CreditCardOutlined,
            title: t("deliveryRules.payment.cardOnline.title"),
            text: t("deliveryRules.payment.cardOnline.text"),
        },
        {
            icon: FileTextOutlined,
            title: t("deliveryRules.payment.cashOnDelivery.title"),
            text: t("deliveryRules.payment.cashOnDelivery.text"),
        },
    ];

    const PACKAGING_RULES: string[] = [
        t("deliveryRules.packagingRules.0"),
        t("deliveryRules.packagingRules.1"),
        t("deliveryRules.packagingRules.2"),
        t("deliveryRules.packagingRules.3"),
    ];

    const PROHIBITED_ITEMS: string[] = [
        t("deliveryRules.prohibitedItems.0"),
        t("deliveryRules.prohibitedItems.1"),
        t("deliveryRules.prohibitedItems.2"),
        t("deliveryRules.prohibitedItems.3"),
        t("deliveryRules.prohibitedItems.4"),
    ];

    const TIMEFRAMES = [
        { label: t("deliveryRules.timeframes.sameCity"), value: t("deliveryRules.timeframes.sameCityValue") },
        { label: t("deliveryRules.timeframes.betweenCities"), value: t("deliveryRules.timeframes.betweenCitiesValue") },
        { label: t("deliveryRules.timeframes.remote"), value: t("deliveryRules.timeframes.remoteValue") },
    ];

    return (
        <div className="bg-white">
            <section className="bg-mm-navy">
                <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-10 text-center">
                    <CarOutlined className="text-4xl text-mm-orange mb-3" />
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">{t("deliveryRules.title")}</h1>
                    <p className="text-white/70 text-sm md:text-base max-w-2xl mx-auto">
                        {t("deliveryRules.subtitle")}
                    </p>
                </div>
            </section>

            <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-10">
                <section className="mb-12">
                    <h2 className="text-xl font-bold text-mm-navy mb-5">{t("deliveryRules.deliveryMethodsHeading")}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {DELIVERY_METHODS.map((method) => (
                            <div key={method.title} className="bg-mm-lavender-light border border-purple-100 rounded-xl p-4">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-mm-purple text-lg mb-3">
                                    <method.icon />
                                </div>
                                <h3 className="text-sm font-bold text-mm-navy mb-1">{method.title}</h3>
                                <p className="text-xs text-gray-500 leading-relaxed">{method.text}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="text-xl font-bold text-mm-navy mb-5">{t("deliveryRules.paymentMethodsHeading")}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {PAYMENT_METHODS.map((method) => (
                            <div key={method.title} className="flex gap-3 bg-white border border-gray-100 rounded-xl p-4">
                                <div className="shrink-0 w-10 h-10 rounded-full bg-mm-lavender flex items-center justify-center text-mm-purple text-lg">
                                    <method.icon />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-mm-navy mb-1">{method.title}</h3>
                                    <p className="text-xs text-gray-500 leading-relaxed">{method.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="text-xl font-bold text-mm-navy mb-5 flex items-center gap-2">
                        <ClockCircleOutlined className="text-mm-purple" /> {t("deliveryRules.timeframesHeading")}
                    </h2>
                    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                        {TIMEFRAMES.map((row, index) => (
                            <div
                                key={row.label}
                                className={`flex items-center justify-between px-5 py-3 text-sm ${index < TIMEFRAMES.length - 1 ? "border-b border-gray-100" : ""}`}
                            >
                                <span className="text-gray-600">{row.label}</span>
                                <span className="font-semibold text-mm-navy">{row.value}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        {t("deliveryRules.timeframesNote")}
                    </p>
                </section>

                <section className="mb-12">
                    <h2 className="text-xl font-bold text-mm-navy mb-5 flex items-center gap-2">
                        <SafetyOutlined className="text-mm-purple" /> {t("deliveryRules.packagingHeading")}
                    </h2>
                    <ul className="flex flex-col gap-2.5 bg-mm-lavender-light border border-purple-100 rounded-xl p-5">
                        {PACKAGING_RULES.map((rule) => (
                            <li key={rule} className="flex items-start gap-2.5 text-sm text-gray-700">
                                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-mm-purple mt-1.5" />
                                {rule}
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="mb-12">
                    <h2 className="text-xl font-bold text-mm-navy mb-5 flex items-center gap-2">
                        <StopOutlined className="text-red-500" /> {t("deliveryRules.prohibitedHeading")}
                    </h2>
                    <div className="bg-red-50 border border-red-100 rounded-xl p-5">
                        <ul className="flex flex-col gap-2 text-sm text-gray-700">
                            {PROHIBITED_ITEMS.map((item) => (
                                <li key={item} className="flex items-start gap-2.5">
                                    <StopOutlined className="text-red-400 mt-0.5 shrink-0 text-xs" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        {t("deliveryRules.prohibitedNote")}
                    </p>
                </section>

                <p className="text-xs text-gray-400 text-center">
                    {t("deliveryRules.footerPrefix")}{" "}
                    <Link to="/delivery-safety" className="text-mm-purple hover:underline">{t("deliveryRules.footerSafetyLink")}</Link>{" "}
                    {t("deliveryRules.footerMiddle")}{" "}
                    <Link to="/security" className="text-mm-purple hover:underline">{t("deliveryRules.footerSecurityLink")}</Link>.
                </p>
            </div>
        </div>
    );
};

export default DeliveryRulesPage;
