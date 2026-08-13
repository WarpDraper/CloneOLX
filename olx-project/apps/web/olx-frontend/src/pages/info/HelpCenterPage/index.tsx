import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Tabs } from "antd";
import { useTranslation } from "react-i18next";
import {
    InfoCircleOutlined,
    QuestionCircleOutlined,
    AppstoreOutlined,
    TeamOutlined,
} from "@ant-design/icons";
import type { TFunction } from "i18next";

interface Section {
    id: string;
    title: string;
    text: string;
}

interface TabConfig {
    key: string;
    path: string;
    label: string;
    icon: React.ComponentType;
    heading: string;
    intro: string;
    sections: Section[];
}

// Consolidates the footer's "Інформація / Допомога / Сервіси / Партнерам" columns into one
// page with a tab per column. Each footer link points at /<path>#<section-id>, so this page
// selects the right tab from the URL and scrolls to the matching section on load.
const getTabs = (t: TFunction): TabConfig[] => [
    {
        key: "info",
        path: "/info",
        label: t("helpCenter.tabs.info.label"),
        icon: InfoCircleOutlined,
        heading: t("helpCenter.tabs.info.heading"),
        intro: t("helpCenter.tabs.info.intro"),
        sections: [
            {
                id: "pro-nas",
                title: t("helpCenter.tabs.info.sections.aboutUs.title"),
                text: t("helpCenter.tabs.info.sections.aboutUs.text"),
            },
            {
                id: "umovy-korystuvannya",
                title: t("helpCenter.tabs.info.sections.terms.title"),
                text: t("helpCenter.tabs.info.sections.terms.text"),
            },
            {
                id: "vakansii",
                title: t("helpCenter.tabs.info.sections.careers.title"),
                text: t("helpCenter.tabs.info.sections.careers.text"),
            },
            {
                id: "kontakty",
                title: t("helpCenter.tabs.info.sections.contacts.title"),
                text: t("helpCenter.tabs.info.sections.contacts.text"),
            },
        ],
    },
    {
        key: "help",
        path: "/help",
        label: t("helpCenter.tabs.help.label"),
        icon: QuestionCircleOutlined,
        heading: t("helpCenter.tabs.help.heading"),
        intro: t("helpCenter.tabs.help.intro"),
        sections: [
            {
                id: "kredyt",
                title: t("helpCenter.tabs.help.sections.credit.title"),
                text: t("helpCenter.tabs.help.sections.credit.text"),
            },
            {
                id: "harantiya",
                title: t("helpCenter.tabs.help.sections.warranty.title"),
                text: t("helpCenter.tabs.help.sections.warranty.text"),
            },
            {
                id: "povernennya",
                title: t("helpCenter.tabs.help.sections.returns.title"),
                text: t("helpCenter.tabs.help.sections.returns.text"),
            },
            {
                id: "servisni-tsentry",
                title: t("helpCenter.tabs.help.sections.serviceCenters.title"),
                text: t("helpCenter.tabs.help.sections.serviceCenters.text"),
            },
        ],
    },
    {
        key: "services",
        path: "/services",
        label: t("helpCenter.tabs.services.label"),
        icon: AppstoreOutlined,
        heading: t("helpCenter.tabs.services.heading"),
        intro: t("helpCenter.tabs.services.intro"),
        sections: [
            {
                id: "bonusnyi-rakhunok",
                title: t("helpCenter.tabs.services.sections.bonusAccount.title"),
                text: t("helpCenter.tabs.services.sections.bonusAccount.text"),
            },
            {
                id: "kartka-multimart",
                title: t("helpCenter.tabs.services.sections.card.title"),
                text: t("helpCenter.tabs.services.sections.card.text"),
            },
            {
                id: "podarunkovi-sertyfikaty",
                title: t("helpCenter.tabs.services.sections.giftCards.title"),
                text: t("helpCenter.tabs.services.sections.giftCards.text"),
            },
            {
                id: "apteka-obmin",
                title: t("helpCenter.tabs.services.sections.pharmacyExchange.title"),
                text: t("helpCenter.tabs.services.sections.pharmacyExchange.text"),
            },
            {
                id: "korporatyvnym-kliientam",
                title: t("helpCenter.tabs.services.sections.corporate.title"),
                text: t("helpCenter.tabs.services.sections.corporate.text"),
            },
        ],
    },
    {
        key: "partners",
        path: "/partners",
        label: t("helpCenter.tabs.partners.label"),
        icon: TeamOutlined,
        heading: t("helpCenter.tabs.partners.heading"),
        intro: t("helpCenter.tabs.partners.intro"),
        sections: [
            {
                id: "prodavaty",
                title: t("helpCenter.tabs.partners.sections.sell.title"),
                text: t("helpCenter.tabs.partners.sections.sell.text"),
            },
            {
                id: "reklama",
                title: t("helpCenter.tabs.partners.sections.ads.title"),
                text: t("helpCenter.tabs.partners.sections.ads.text"),
            },
            {
                id: "spivpratsya",
                title: t("helpCenter.tabs.partners.sections.cooperation.title"),
                text: t("helpCenter.tabs.partners.sections.cooperation.text"),
            },
            {
                id: "franchyzynh",
                title: t("helpCenter.tabs.partners.sections.franchise.title"),
                text: t("helpCenter.tabs.partners.sections.franchise.text"),
            },
            {
                id: "orenda",
                title: t("helpCenter.tabs.partners.sections.rental.title"),
                text: t("helpCenter.tabs.partners.sections.rental.text"),
            },
        ],
    },
];

const HelpCenterPage: React.FC = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const scrolledHash = useRef<string | null>(null);
    const TABS = getTabs(t);

    const activeTab = TABS.find((t) => t.path === location.pathname) ?? TABS[0];

    useEffect(() => {
        const hash = location.hash.replace("#", "");
        if (!hash || scrolledHash.current === location.hash) return;
        const el = document.getElementById(hash);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            el.classList.add("ring-2", "ring-mm-purple");
            window.setTimeout(() => el.classList.remove("ring-2", "ring-mm-purple"), 1600);
        }
        scrolledHash.current = location.hash;
    }, [location.pathname, location.hash]);

    return (
        <div className="bg-white">
            <section className="bg-mm-navy">
                <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-10 text-center">
                    <QuestionCircleOutlined className="text-4xl text-mm-orange mb-3" />
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">{activeTab.heading}</h1>
                    <p className="text-white/70 text-sm md:text-base max-w-2xl mx-auto">{activeTab.intro}</p>
                </div>
            </section>

            <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-10">
                <Tabs
                    activeKey={activeTab.key}
                    onChange={(key) => {
                        const tab = TABS.find((t) => t.key === key);
                        if (tab) navigate(tab.path);
                    }}
                    items={TABS.map((tab) => ({
                        key: tab.key,
                        label: (
                            <span className="flex items-center gap-1.5">
                                <tab.icon /> {tab.label}
                            </span>
                        ),
                        children: (
                            <div className="flex flex-col gap-3 mt-2">
                                {tab.sections.map((section) => (
                                    <div
                                        key={section.id}
                                        id={section.id}
                                        className="scroll-mt-24 bg-mm-lavender-light border border-purple-100 rounded-xl p-4 transition-shadow"
                                    >
                                        <h3 className="text-sm font-bold text-mm-navy mb-1.5">{section.title}</h3>
                                        <p className="text-xs text-gray-600 leading-relaxed">{section.text}</p>
                                    </div>
                                ))}
                            </div>
                        ),
                    }))}
                />

                <p className="text-xs text-gray-400 text-center mt-10">
                    {t("helpCenter.footerPrefix")}{" "}
                    <Link to="/delivery-rules" className="text-mm-purple hover:underline">{t("helpCenter.footerDeliveryRulesLink")}</Link>,{" "}
                    <Link to="/delivery-safety" className="text-mm-purple hover:underline">{t("helpCenter.footerDeliverySafetyLink")}</Link>,{" "}
                    <Link to="/security" className="text-mm-purple hover:underline">{t("helpCenter.footerSecurityLink")}</Link>.
                </p>
            </div>
        </div>
    );
};

export default HelpCenterPage;
