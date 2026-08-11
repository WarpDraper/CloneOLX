import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    SafetyCertificateOutlined,
    LockOutlined,
    EyeInvisibleOutlined,
    DollarCircleOutlined,
    EnvironmentOutlined,
    WarningOutlined,
    PhoneOutlined,
    MessageOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
} from "@ant-design/icons";

interface RuleCard {
    icon: React.ComponentType;
    title: string;
    text: string;
}

const SecurityPage: React.FC = () => {
    const { t } = useTranslation();

    const BUYER_RULES: RuleCard[] = [
        {
            icon: EnvironmentOutlined,
            title: t("security.buyerRules.meetInPublic.title"),
            text: t("security.buyerRules.meetInPublic.text"),
        },
        {
            icon: DollarCircleOutlined,
            title: t("security.buyerRules.payAfterCheck.title"),
            text: t("security.buyerRules.payAfterCheck.text"),
        },
        {
            icon: EyeInvisibleOutlined,
            title: t("security.buyerRules.dontShareData.title"),
            text: t("security.buyerRules.dontShareData.text"),
        },
        {
            icon: SafetyCertificateOutlined,
            title: t("security.buyerRules.checkSeller.title"),
            text: t("security.buyerRules.checkSeller.text"),
        },
    ];

    const RED_FLAGS: string[] = [
        t("security.redFlags.0"),
        t("security.redFlags.1"),
        t("security.redFlags.2"),
        t("security.redFlags.3"),
        t("security.redFlags.4"),
        t("security.redFlags.5"),
    ];

    const SAFE_STEPS: { title: string; text: string }[] = [
        { title: t("security.safeSteps.0.title"), text: t("security.safeSteps.0.text") },
        { title: t("security.safeSteps.1.title"), text: t("security.safeSteps.1.text") },
        { title: t("security.safeSteps.2.title"), text: t("security.safeSteps.2.text") },
        { title: t("security.safeSteps.3.title"), text: t("security.safeSteps.3.text") },
        { title: t("security.safeSteps.4.title"), text: t("security.safeSteps.4.text") },
    ];

    return (
        <div className="bg-white">
            <section className="bg-mm-navy">
                <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-10 text-center">
                    <SafetyCertificateOutlined className="text-4xl text-mm-orange mb-3" />
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">{t("security.title")}</h1>
                    <p className="text-white/70 text-sm md:text-base max-w-2xl mx-auto">
                        {t("security.subtitle")}
                    </p>
                </div>
            </section>

            <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-10">
                <section className="mb-12">
                    <h2 className="text-xl font-bold text-mm-navy mb-5">{t("security.buyerRulesHeading")}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {BUYER_RULES.map((rule) => (
                            <div key={rule.title} className="flex gap-3 bg-mm-lavender-light border border-purple-100 rounded-xl p-4">
                                <div className="shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center text-mm-purple text-lg">
                                    <rule.icon />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-mm-navy mb-1">{rule.title}</h3>
                                    <p className="text-xs text-gray-500 leading-relaxed">{rule.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="text-xl font-bold text-mm-navy mb-5">{t("security.safeStepsHeading")}</h2>
                    <div className="flex flex-col gap-3">
                        {SAFE_STEPS.map((step, index) => (
                            <div key={step.title} className="flex items-start gap-4 bg-white border border-gray-100 rounded-xl p-4">
                                <span className="shrink-0 w-8 h-8 rounded-full bg-mm-purple text-white text-sm font-bold flex items-center justify-center">
                                    {index + 1}
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold text-mm-navy mb-0.5">{step.title}</h3>
                                    <p className="text-xs text-gray-500">{step.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="text-xl font-bold text-mm-navy mb-5 flex items-center gap-2">
                        <WarningOutlined className="text-mm-orange" /> {t("security.redFlagsHeading")}
                    </h2>
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-5">
                        <ul className="flex flex-col gap-2.5">
                            {RED_FLAGS.map((flag) => (
                                <li key={flag} className="flex items-start gap-2.5 text-sm text-gray-700">
                                    <CloseCircleOutlined className="text-red-500 mt-0.5 shrink-0" />
                                    {flag}
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="text-xl font-bold text-mm-navy mb-5 flex items-center gap-2">
                        <LockOutlined className="text-mm-purple" /> {t("security.personalDataHeading")}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                        <p className="bg-white border border-gray-100 rounded-xl p-4 leading-relaxed">
                            {t("security.personalData.paragraph1")}
                        </p>
                        <p className="bg-white border border-gray-100 rounded-xl p-4 leading-relaxed">
                            {t("security.personalData.paragraph2")}
                        </p>
                    </div>
                </section>

                <section className="bg-mm-navy rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                            <CheckCircleOutlined className="text-green-400" /> {t("security.reportHeading")}
                        </h2>
                        <p className="text-white/70 text-sm max-w-lg">
                            {t("security.reportText")}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                        <Link
                            to="/chat"
                            className="flex items-center justify-center gap-2 bg-mm-purple hover:bg-mm-purple-dark text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors"
                        >
                            <MessageOutlined /> {t("security.contactSupport")}
                        </Link>
                        <a
                            href="tel:0800123456"
                            className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors"
                        >
                            <PhoneOutlined /> 0 800 123 456
                        </a>
                    </div>
                </section>

                <p className="text-xs text-gray-400 text-center mt-8">
                    {t("security.footerPrefix")}{" "}
                    <Link to="/delivery-safety" className="text-mm-purple hover:underline">{t("security.footerDeliverySafetyLink")}</Link>{" "}
                    {t("security.footerMiddle")}{" "}
                    <Link to="/delivery-rules" className="text-mm-purple hover:underline">{t("security.footerDeliveryRulesLink")}</Link>.
                </p>
            </div>
        </div>
    );
};

export default SecurityPage;
