import React from "react";
import { Collapse } from "antd";
import { FileProtectOutlined } from "@ant-design/icons";

interface TermsSection {
    key: string;
    title: string;
    text: string;
}

const TERMS_SECTIONS: TermsSection[] = [
    {
        key: "general",
        title: "1. Загальні положення",
        text: "Використовуючи MultiMart, користувач погоджується з цими умовами користування. Якщо ви не згодні з будь-яким пунктом — будь ласка, утримайтеся від використання сервісу. Ми можемо оновлювати умови, актуальна версія завжди доступна на цій сторінці.",
    },
    {
        key: "account",
        title: "2. Реєстрація та обліковий запис",
        text: "Для розміщення оголошень потрібна реєстрація з дійсною email-адресою та номером телефону. Користувач відповідає за збереження конфіденційності даних свого облікового запису та за всі дії, здійснені під ним.",
    },
    {
        key: "content",
        title: "3. Розміщення оголошень",
        text: "Оголошення мають містити достовірну інформацію про товар чи послугу, коректні фото та реальну ціну. Заборонено розміщувати оголошення про заборонені законодавством України товари, а також оманливий чи образливий контент.",
    },
    {
        key: "communication",
        title: "4. Спілкування та угоди",
        text: "Спілкування між покупцем і продавцем відбувається через чат платформи. MultiMart не є стороною угоди між користувачами й не гарантує якість товару — рекомендуємо перевіряти товар особисто перед оплатою.",
    },
    {
        key: "payments",
        title: "5. Оплата та доставка",
        text: "Оплата та доставка узгоджуються безпосередньо між покупцем і продавцем. Для безпечних розрахунків рекомендуємо використовувати перевірені служби доставки з післяплатою.",
    },
    {
        key: "liability",
        title: "6. Відповідальність сторін",
        text: "MultiMart докладає зусиль для підтримки безпечного середовища, але не несе відповідальності за дії користувачів, якість товарів чи виконання зобов'язань за угодами між покупцем і продавцем.",
    },
    {
        key: "privacy",
        title: "7. Конфіденційність",
        text: "Персональні дані користувачів обробляються відповідно до чинного законодавства України про захист персональних даних і використовуються виключно для роботи сервісу.",
    },
    {
        key: "termination",
        title: "8. Призупинення доступу",
        text: "MultiMart залишає за собою право обмежити або призупинити доступ до облікового запису в разі порушення цих умов, зокрема шахрайства, спаму чи розміщення забороненого контенту.",
    },
];

// /terms — "Умови користування": structured legal/usage terms with accordion tabs.
const TermsPage: React.FC = () => {
    return (
        <div className="bg-white">
            <section className="bg-mm-navy">
                <div className="max-w-[900px] mx-auto px-4 md:px-6 py-10 text-center">
                    <FileProtectOutlined className="text-4xl text-mm-orange mb-3" />
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">Умови користування</h1>
                    <p className="text-white/70 text-sm md:text-base max-w-2xl mx-auto">
                        Правила використання платформи MultiMart для покупців і продавців.
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
                    Дата останнього оновлення: 10.08.2026. З питань щодо умов користування звертайтеся до служби підтримки.
                </p>
            </div>
        </div>
    );
};

export default TermsPage;
