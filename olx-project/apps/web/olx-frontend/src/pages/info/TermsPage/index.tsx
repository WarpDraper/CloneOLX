import React from "react";
import { Collapse } from "antd";
import { FileProtectOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

interface TermsSection {
    key: string;
    title: string;
    text: string;
}

// /terms — "Умови користування": structured legal/usage terms with accordion tabs.
const TermsPage: React.FC = () => {
    const { t } = useTranslation();

    const TERMS_SECTIONS: TermsSection[] = [
        {
            key: "general",
            title: t("terms.sections.general.title"),
            text: t("terms.sections.general.text"),
        },
        {
            key: "account",
            title: t("terms.sections.account.title"),
            text: t("terms.sections.account.text"),
        },
        {
            key: "content",
            title: t("terms.sections.content.title"),
            text: t("terms.sections.content.text"),
        },
        {
            key: "communication",
            title: t("terms.sections.communication.title"),
            text: t("terms.sections.communication.text"),
        },
        {
            key: "payments",
            title: t("terms.sections.payments.title"),
            text: t("terms.sections.payments.text"),
        },
        {
            key: "liability",
            title: t("terms.sections.liability.title"),
            text: t("terms.sections.liability.text"),
        },
        {
            key: "privacy",
            title: t("terms.sections.privacy.title"),
            text: t("terms.sections.privacy.text"),
        },
        {
            key: "termination",
            title: t("terms.sections.termination.title"),
            text: t("terms.sections.termination.text"),
        },
    ];

    return (
        <div className="bg-white">
            <section className="bg-mm-navy">
                <div className="max-w-[900px] mx-auto px-4 md:px-6 py-10 text-center">
                    <FileProtectOutlined className="text-4xl text-mm-orange mb-3" />
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">{t("terms.title")}</h1>
                    <p className="text-white/70 text-sm md:text-base max-w-2xl mx-auto">
                        {t("terms.subtitle")}
                    </p>
                </div>
            </section>

            <div className="max-w-[900px] mx-auto px-4 md:px-6 py-10">
                <Collapse
                    accordion
                    bordered={false}
                    className="bg-transparent"
                    defaultActiveKey={["general"]}
                    items={TERMS_SECTIONS.map((section) => ({
                        key: section.key,
                        label: <span className="font-bold text-mm-navy text-sm">{section.title}</span>,
                        children: <p className="text-xs md:text-sm text-gray-600 leading-relaxed">{section.text}</p>,
                        className: "mb-3 bg-mm-lavender-light border border-purple-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow",
                    }))}
                />

                <p className="text-xs text-gray-400 text-center mt-8">
                    {t("terms.lastUpdated")}
                </p>
            </div>
        </div>
    );
};

export default TermsPage;
