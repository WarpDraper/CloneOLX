import React from "react";
import { Link } from "react-router-dom";
import {
    RocketOutlined,
    SafetyCertificateOutlined,
    TeamOutlined,
    ThunderboltOutlined,
    ShopOutlined,
    GlobalOutlined,
} from "@ant-design/icons";

const STATS = [
    { value: "500+", label: "Активних оголошень" },
    { value: "100+", label: "Продавців на майданчику" },
    { value: "25", label: "Категорій товарів" },
    { value: "24/7", label: "Підтримка користувачів" },
];

const VALUES = [
    {
        icon: SafetyCertificateOutlined,
        title: "Безпека угод",
        text: "Перевірені продавці, безпечні способи оплати та доставки — ми дбаємо про спокій кожної угоди.",
    },
    {
        icon: ThunderboltOutlined,
        title: "Швидкість",
        text: "Розмістити оголошення чи знайти потрібний товар можна за лічені хвилини.",
    },
    {
        icon: TeamOutlined,
        title: "Спільнота",
        text: "Тисячі покупців і продавців по всій Україні щодня знаходять один одного на MultiMart.",
    },
    {
        icon: GlobalOutlined,
        title: "Доступність",
        text: "Сервіс працює в усіх регіонах України з локальною доставкою через перевірених партнерів.",
    },
];

// /about — "Про нас": rich visual presentation of MultiMart (stats, mission, animated cards).
const AboutPage: React.FC = () => {
    return (
        <div className="bg-white">
            <section className="bg-mm-navy relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full bg-mm-purple blur-3xl" />
                    <div className="absolute -bottom-10 -right-10 w-72 h-72 rounded-full bg-mm-orange blur-3xl" />
                </div>
                <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-14 text-center relative">
                    <ShopOutlined className="text-5xl text-mm-orange mb-4" />
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-4">Про MultiMart</h1>
                    <p className="text-white/70 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
                        MultiMart — майданчик оголошень нового покоління, де тисячі продавців і покупців щодня
                        знаходять один одного. Ми будуємо зручний, швидкий і безпечний простір для торгівлі
                        товарами та послугами по всій Україні.
                    </p>
                </div>
            </section>

            <section className="max-w-[1100px] mx-auto px-4 md:px-6 -mt-8 relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {STATS.map((stat) => (
                        <div
                            key={stat.label}
                            className="bg-white rounded-2xl shadow-lg hover:shadow-xl border border-gray-100 p-5 text-center transition-all duration-300 hover:-translate-y-1"
                        >
                            <p className="text-2xl md:text-3xl font-bold text-mm-purple mb-1">{stat.value}</p>
                            <p className="text-xs md:text-sm text-gray-500">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="max-w-[1000px] mx-auto px-4 md:px-6 py-14">
                <div className="flex flex-col md:flex-row items-center gap-8 mb-14">
                    <div className="flex-1">
                        <h2 className="text-xl md:text-2xl font-bold text-mm-navy mb-3">Наша місія</h2>
                        <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                            Ми віримо, що купувати й продавати повинно бути просто. MultiMart об'єднує людей,
                            допомагає речам знаходити нових власників, а бізнесу — нових клієнтів. Кожне
                            оголошення — це можливість, і наша задача зробити цю можливість доступною для всіх.
                        </p>
                    </div>
                    <div className="flex-1 flex justify-center">
                        <div className="w-40 h-40 md:w-48 md:h-48 rounded-3xl bg-mm-lavender-light border border-purple-100 shadow-lg flex items-center justify-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            <RocketOutlined className="text-6xl text-mm-purple" />
                        </div>
                    </div>
                </div>

                <h2 className="text-xl md:text-2xl font-bold text-mm-navy mb-6 text-center">Чому MultiMart</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {VALUES.map((value) => (
                        <div
                            key={value.title}
                            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-mm-purple/40"
                        >
                            <div className="w-11 h-11 rounded-xl bg-mm-lavender flex items-center justify-center mb-3">
                                <value.icon className="text-lg text-mm-purple" />
                            </div>
                            <h3 className="text-sm font-bold text-mm-navy mb-1.5">{value.title}</h3>
                            <p className="text-xs text-gray-600 leading-relaxed">{value.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="bg-mm-lavender-light">
                <div className="max-w-[800px] mx-auto px-4 md:px-6 py-10 text-center">
                    <h2 className="text-lg md:text-xl font-bold text-mm-navy mb-3">Готові почати?</h2>
                    <p className="text-sm text-gray-600 mb-5">
                        Розмістіть перше оголошення або перегляньте тисячі пропозицій вже сьогодні.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <Link
                            to="/adverts/create"
                            className="bg-mm-orange hover:bg-orange-500 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-all duration-300 hover:-translate-y-1 shadow-sm"
                        >
                            Додати оголошення
                        </Link>
                        <Link
                            to="/search"
                            className="bg-white hover:bg-gray-50 text-mm-navy font-bold text-sm px-6 py-2.5 rounded-lg border border-gray-200 transition-all duration-300 hover:-translate-y-1 shadow-sm"
                        >
                            Усі товари
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AboutPage;
