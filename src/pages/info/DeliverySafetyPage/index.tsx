import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    SafetyOutlined,
    EyeOutlined,
    NumberOutlined,
    CameraOutlined,
    LockOutlined,
    WarningOutlined,
    PhoneOutlined,
    ExclamationCircleOutlined,
} from "@ant-design/icons";

const DeliverySafetyPage: React.FC = () => {
    const { t } = useTranslation();

    const PICKUP_STEPS: { title: string; text: string }[] = [
        { title: t("deliverySafety.steps.0.title"), text: t("deliverySafety.steps.0.text") },
        { title: t("deliverySafety.steps.1.title"), text: t("deliverySafety.steps.1.text") },
        { title: t("deliverySafety.steps.2.title"), text: t("deliverySafety.steps.2.text") },
        { title: t("deliverySafety.steps.3.title"), text: t("deliverySafety.steps.3.text") },
        { title: t("deliverySafety.steps.4.title"), text: t("deliverySafety.steps.4.text") },
    ];

    const MAIL_SECURITY_TIPS: string[] = [
        t("deliverySafety.tips.0"),
        t("deliverySafety.tips.1"),
        t("deliverySafety.tips.2"),
        t("deliverySafety.tips.3"),
        t("deliverySafety.tips.4"),
    ];

    const RED_FLAGS: string[] = [
        t("deliverySafety.redFlags.0"),
        t("deliverySafety.redFlags.1"),
        t("deliverySafety.redFlags.2"),
        t("deliverySafety.redFlags.3"),
    ];

    return (
        <div className="bg-white">
            <section className="bg-mm-navy">
                <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-10 text-center">
                    <SafetyOutlined className="text-4xl text-mm-orange mb-3" />
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">{t("deliverySafety.title")}</h1>
                    <p className="text-white/70 text-sm md:text-base max-w-2xl mx-auto">
                        {t("deliverySafety.subtitle")}
                    </p>
                </div>
            </section>

            <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-10">
                <section className="mb-12">
                    <h2 className="text-xl font-bold text-mm-navy mb-5 flex items-center gap-2">
                        <EyeOutlined className="text-mm-purple" /> {t("deliverySafety.pickupHeading")}
                    </h2>
                    <div className="flex flex-col gap-3">
                        {PICKUP_STEPS.map((step, index) => (
                            <div key={step.title} className="flex items-start gap-4 bg-white border border-gray-100 rounded-xl p-4">
                                <span className="shrink-0 w-8 h-8 rounded-full bg-mm-purple text-white text-sm font-bold flex items-center justify-center">
                                    {index + 1}
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold text-mm-navy mb-0.5">{step.title}</h3>
                                    <p className="text-xs text-gray-500 leading-relaxed">{step.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-mm-lavender-light border border-purple-100 rounded-xl p-4 text-center">
                        <NumberOutlined className="text-2xl text-mm-purple mb-2" />
                        <h3 className="text-sm font-bold text-mm-navy mb-1">{t("deliverySafety.cards.checkEn.title")}</h3>
                        <p className="text-xs text-gray-500">{t("deliverySafety.cards.checkEn.text")}</p>
                    </div>
                    <div className="bg-mm-lavender-light border border-purple-100 rounded-xl p-4 text-center">
                        <CameraOutlined className="text-2xl text-mm-purple mb-2" />
                        <h3 className="text-sm font-bold text-mm-navy mb-1">{t("deliverySafety.cards.filmUnboxing.title")}</h3>
                        <p className="text-xs text-gray-500">{t("deliverySafety.cards.filmUnboxing.text")}</p>
                    </div>
                    <div className="bg-mm-lavender-light border border-purple-100 rounded-xl p-4 text-center">
                        <LockOutlined className="text-2xl text-mm-purple mb-2" />
                        <h3 className="text-sm font-bold text-mm-navy mb-1">{t("deliverySafety.cards.dontShareCodes.title")}</h3>
                        <p className="text-xs text-gray-500">{t("deliverySafety.cards.dontShareCodes.text")}</p>
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="text-xl font-bold text-mm-navy mb-5">{t("deliverySafety.tipsHeading")}</h2>
                    <ul className="flex flex-col gap-2.5 bg-white border border-gray-100 rounded-xl p-5">
                        {MAIL_SECURITY_TIPS.map((tip) => (
                            <li key={tip} className="flex items-start gap-2.5 text-sm text-gray-700">
                                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-mm-purple mt-1.5" />
                                {tip}
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="mb-12">
                    <h2 className="text-xl font-bold text-mm-navy mb-5 flex items-center gap-2">
                        <WarningOutlined className="text-mm-orange" /> {t("deliverySafety.redFlagsHeading")}
                    </h2>
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-5">
                        <ul className="flex flex-col gap-2.5">
                            {RED_FLAGS.map((flag) => (
                                <li key={flag} className="flex items-start gap-2.5 text-sm text-gray-700">
                                    <ExclamationCircleOutlined className="text-red-500 mt-0.5 shrink-0" />
                                    {flag}
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section className="bg-mm-navy rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-lg font-bold text-white mb-2">{t("deliverySafety.contact.title")}</h2>
                        <p className="text-white/70 text-sm max-w-lg">
                            {t("deliverySafety.contact.text")}
                        </p>
                    </div>
                    <a
                        href="tel:0800500609"
                        className="flex items-center justify-center gap-2 bg-mm-purple hover:bg-mm-purple-dark text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors shrink-0"
                    >
                        <PhoneOutlined /> {t("deliverySafety.contact.phone")}
                    </a>
                </section>

                <p className="text-xs text-gray-400 text-center mt-8">
                    {t("deliverySafety.footerPrefix")}{" "}
                    <Link to="/delivery-rules" className="text-mm-purple hover:underline">{t("deliverySafety.footerRulesLink")}</Link>{" "}
                    {t("deliverySafety.footerMiddle")}{" "}
                    <Link to="/security" className="text-mm-purple hover:underline">{t("deliverySafety.footerSecurityLink")}</Link>.
                </p>
            </div>
        </div>
    );
};

export default DeliverySafetyPage;
