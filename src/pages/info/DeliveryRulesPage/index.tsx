import React from "react";
import { Link } from "react-router-dom";
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

const DELIVERY_METHODS: MethodCard[] = [
    {
        icon: CarOutlined,
        title: "OLX Доставка (Нова пошта)",
        text: "Продавець відправляє посилку на обране вами відділення чи поштомат Нової пошти. Відстежити статус можна за номером ЕН у чаті замовлення.",
    },
    {
        icon: ShopOutlined,
        title: "Самовивіз",
        text: "Забираєте товар безпосередньо у продавця. Адресу й час узгоджуєте в чаті після оформлення замовлення.",
    },
    {
        icon: HomeOutlined,
        title: "Кур'єрська доставка",
        text: "Кур'єр привозить замовлення за вказаною адресою. Доступність залежить від населеного пункту продавця й покупця.",
    },
];

const PAYMENT_METHODS: MethodCard[] = [
    {
        icon: CreditCardOutlined,
        title: "Оплата карткою онлайн",
        text: "Кошти списуються одразу при оформленні замовлення й утримуються до підтвердження отримання товару.",
    },
    {
        icon: FileTextOutlined,
        title: "Накладений платіж",
        text: "Оплата при отриманні на відділенні Нової пошти. Комісію накладеного платежу сплачує отримувач згідно з тарифами перевізника.",
    },
];

const PACKAGING_RULES: string[] = [
    "Товар має бути упакований відповідно до його ваги, розмірів та крихкості — коробка або пакування, що витримує транспортування.",
    "Крихкі та електронні товари додатково обгортаються амортизуючим матеріалом (бульбашкова плівка, пінопласт).",
    "На посилці вказується коректний номер ЕН (експрес-накладної) та контактні дані отримувача.",
    "Рідини, речовини під тиском та товари з обмеженнями перевізника пакуються згідно з правилами Нової пошти.",
];

const PROHIBITED_ITEMS: string[] = [
    "Зброя, боєприпаси та вибухові речовини",
    "Наркотичні й психотропні речовини",
    "Готівкові кошти, банківські картки, цінні папери",
    "Швидкопсувні продукти без спеціального пакування",
    "Товари, заборонені до пересилання законодавством України",
];

const TIMEFRAMES = [
    { label: "У межах одного міста", value: "1 робочий день" },
    { label: "Між обласними центрами", value: "1–2 робочих дні" },
    { label: "У віддалені населені пункти", value: "2–4 робочих дні" },
];

const DeliveryRulesPage: React.FC = () => {
    return (
        <div className="bg-white">
            <section className="bg-mm-navy">
                <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-10 text-center">
                    <CarOutlined className="text-4xl text-mm-orange mb-3" />
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">Правила доставки</h1>
                    <p className="text-white/70 text-sm md:text-base max-w-2xl mx-auto">
                        Способи доставки та оплати, терміни, вимоги до пакування та політика Нової пошти —
                        усе, що потрібно знати перед оформленням замовлення.
                    </p>
                </div>
            </section>

            <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-10">
                <section className="mb-12">
                    <h2 className="text-xl font-bold text-mm-navy mb-5">Способи доставки</h2>
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
                    <h2 className="text-xl font-bold text-mm-navy mb-5">Способи оплати</h2>
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
                        <ClockCircleOutlined className="text-mm-purple" /> Орієнтовні терміни доставки
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
                        Терміни орієнтовні та можуть змінюватись залежно від завантаженості відділень Нової пошти
                        та дати фактичної передачі відправлення перевізнику.
                    </p>
                </section>

                <section className="mb-12">
                    <h2 className="text-xl font-bold text-mm-navy mb-5 flex items-center gap-2">
                        <SafetyOutlined className="text-mm-purple" /> Вимоги до пакування
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
                        <StopOutlined className="text-red-500" /> Заборонено до пересилання
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
                        Повний перелік обмежень визначається чинними правилами перевезення АТ «Нова пошта».
                    </p>
                </section>

                <p className="text-xs text-gray-400 text-center">
                    Готуєте посилку до відправлення? Перегляньте{" "}
                    <Link to="/delivery-safety" className="text-mm-purple hover:underline">правила безпечного отримання</Link>{" "}
                    та поради щодо{" "}
                    <Link to="/security" className="text-mm-purple hover:underline">безпечних угод</Link>.
                </p>
            </div>
        </div>
    );
};

export default DeliveryRulesPage;
