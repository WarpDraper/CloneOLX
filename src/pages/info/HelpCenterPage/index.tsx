import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Tabs } from "antd";
import {
    InfoCircleOutlined,
    QuestionCircleOutlined,
    AppstoreOutlined,
    TeamOutlined,
} from "@ant-design/icons";

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
const TABS: TabConfig[] = [
    {
        key: "info",
        path: "/info",
        label: "Інформація",
        icon: InfoCircleOutlined,
        heading: "Інформація про MultiMart",
        intro: "Хто ми, на яких умовах працює майданчик і як з нами зв'язатися.",
        sections: [
            {
                id: "pro-nas",
                title: "Про нас",
                text: "MultiMart — майданчик оголошень, де тисячі продавців і покупців щодня знаходять один одного. Ми будуємо зручний і безпечний простір для торгівлі товарами та послугами по всій Україні.",
            },
            {
                id: "umovy-korystuvannya",
                title: "Умови користування",
                text: "Реєструючись на MultiMart, користувач погоджується публікувати лише достовірну інформацію про товар, дотримуватись правил спілкування в чаті та не порушувати чинне законодавство України. Повний текст правил надається за запитом у службу підтримки.",
            },
            {
                id: "vakansii",
                title: "Вакансії",
                text: "Команда MultiMart росте — актуальні відкриті позиції публікуються в розділі кар'єри. Резюме можна надіслати через форму зворотного зв'язку в чаті підтримки.",
            },
            {
                id: "kontakty",
                title: "Контакти",
                text: "Служба підтримки: 0 800 123 456 (безкоштовно по Україні), чат підтримки доступний з будь-якої сторінки сайту після входу в акаунт.",
            },
        ],
    },
    {
        key: "help",
        path: "/help",
        label: "Допомога",
        icon: QuestionCircleOutlined,
        heading: "Центр допомоги",
        intro: "Відповіді про кредит, гарантію, повернення товару та сервісні центри. Питання доставки та безпеки угод — на окремих сторінках нижче.",
        sections: [
            {
                id: "kredyt",
                title: "Кредит",
                text: "Оформити покупку в кредит можна від партнерських банків просто на сторінці оформлення замовлення — оберіть спосіб оплати «Кредит» та вкажіть потрібні дані.",
            },
            {
                id: "harantiya",
                title: "Гарантія",
                text: "Гарантійний термін вказується продавцем у картці товару. Для гарантійного обслуговування зверніться до продавця через чат або до найближчого сервісного центру з підтвердженням покупки.",
            },
            {
                id: "povernennya",
                title: "Повернення",
                text: "Товар належної якості можна повернути протягом 14 днів з моменту отримання, якщо він не був у використанні та зберіг товарний вигляд. Оформіть повернення через чат із продавцем.",
            },
            {
                id: "servisni-tsentry",
                title: "Сервісні центри",
                text: "Перелік авторизованих сервісних центрів по категоріях товарів надає продавець у картці оголошення або служба підтримки за запитом.",
            },
        ],
    },
    {
        key: "services",
        path: "/services",
        label: "Сервіси",
        icon: AppstoreOutlined,
        heading: "Сервіси MultiMart",
        intro: "Додаткові можливості для покупців і бізнесу.",
        sections: [
            {
                id: "bonusnyi-rakhunok",
                title: "Бонусний рахунок",
                text: "Накопичуйте бонуси за покупки та оплачуйте ними частину наступних замовлень. Баланс рахунку відображається в особистому кабінеті.",
            },
            {
                id: "kartka-multimart",
                title: "Картка MultiMart",
                text: "Партнерська картка дає розширений кешбек на покупки та доступ до знижок від партнерів сервісу.",
            },
            {
                id: "podarunkovi-sertyfikaty",
                title: "Подарункові сертифікати",
                text: "Електронні сертифікати номіналом на вибір можна подарувати чи використати як оплату замовлення на MultiMart.",
            },
            {
                id: "apteka-obmin",
                title: "Аптека-Обмін",
                text: "Сервіс обміну товарів для аптечної категорії — узгоджується напряму з продавцем у чаті замовлення.",
            },
            {
                id: "korporatyvnym-kliientam",
                title: "Корпоративним клієнтам",
                text: "Для юридичних осіб доступні оптові умови, рахунки з ПДВ та персональний менеджер. Зверніться через чат підтримки, тема «Корпоративним клієнтам».",
            },
        ],
    },
    {
        key: "partners",
        path: "/partners",
        label: "Партнерам",
        icon: TeamOutlined,
        heading: "Партнерам MultiMart",
        intro: "Можливості для продавців, рекламодавців та бізнес-партнерів.",
        sections: [
            {
                id: "prodavaty",
                title: "Продавати на MultiMart",
                text: "Створіть перше оголошення за кілька хвилин — кнопка «Додати оголошення» доступна після входу в акаунт у верхньому меню.",
            },
            {
                id: "reklama",
                title: "Реклама",
                text: "Рекламні можливості на майданчику — банери, просування оголошень та категорій. Деталі й тарифи надає команда підтримки.",
            },
            {
                id: "spivpratsya",
                title: "Співпраця",
                text: "Відкриті до партнерств із брендами, службами доставки та іншими сервісами. Пропозиції надсилайте через чат підтримки.",
            },
            {
                id: "franchyzynh",
                title: "Франчайзинг",
                text: "Умови франчайзингової моделі MultiMart для регіональних партнерів надаються за індивідуальним запитом.",
            },
            {
                id: "orenda",
                title: "Оренда",
                text: "Розділ оренди товарів і нерухомості працює за тими самими правилами розміщення оголошень, що й продаж.",
            },
        ],
    },
];

const HelpCenterPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const scrolledHash = useRef<string | null>(null);

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
                    Питання доставки та безпеки угод — на окремих сторінках:{" "}
                    <Link to="/delivery-rules" className="text-mm-purple hover:underline">правила доставки</Link>,{" "}
                    <Link to="/delivery-safety" className="text-mm-purple hover:underline">безпека доставки</Link>,{" "}
                    <Link to="/security" className="text-mm-purple hover:underline">безпека угод</Link>.
                </p>
            </div>
        </div>
    );
};

export default HelpCenterPage;
