import React from "react";
import { Link } from "react-router-dom";
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

const BUYER_RULES: RuleCard[] = [
    {
        icon: EnvironmentOutlined,
        title: "Зустрічайтесь у людних місцях",
        text: "Для особистих зустрічей обирайте людні, добре освітлені місця — торгові центри, відділення пошти, людні вулиці. Уникайте зустрічей наодинці у під'їздах чи безлюдних місцях.",
    },
    {
        icon: DollarCircleOutlined,
        title: "Оплачуйте після перевірки товару",
        text: "Перевіряйте товар особисто перед оплатою. Якщо оплата онлайн — користуйтеся лише «OLX Доставкою» з перевіркою при отриманні, а не прямими переказами незнайомцям.",
    },
    {
        icon: EyeInvisibleOutlined,
        title: "Не діліться зайвими даними",
        text: "Продавцю для угоди ніколи не потрібні дані вашої картки, CVV-код, SMS-коди підтвердження чи пароль від додатку банку. Якщо просять — це шахрайство.",
    },
    {
        icon: SafetyCertificateOutlined,
        title: "Перевіряйте продавця",
        text: "Дивіться рейтинг і кількість відгуків, дату реєстрації акаунта, наявність підтвердженого номера телефону. Новий акаунт без історії — привід бути уважнішим.",
    },
];

const RED_FLAGS: string[] = [
    "Ціна значно нижча за ринкову «щоб швидше продати»",
    "Продавець наполягає на передоплаті на карту до огляду товару",
    "Прохання зателефонувати/написати «в іншому месенджері» одразу, оминаючи чат MultiMart",
    "Посилання на «перевірку» чи «розморозку рахунку» поза офіційним сайтом",
    "Прохання назвати код з SMS або CVV-код картки",
    "Оголошення без фото товару або з фото, «вкраденими» з інтернету",
];

const SAFE_STEPS: { title: string; text: string }[] = [
    { title: "Спілкуйтеся в чаті MultiMart", text: "Уся переписка та історія домовленостей зберігається — це ваш захист у разі спору." },
    { title: "Перевірте оголошення та профіль", text: "Рейтинг, відгуки, дата реєстрації — попереджають про потенційно ризиковані угоди." },
    { title: "Огляньте товар перед оплатою", text: "За можливості — особисто або через відділення доставки з опцією перевірки вкладення." },
    { title: "Використовуйте безпечні способи оплати", text: "«OLX Доставка» з післяплатою або оплата карткою через офіційний застосунок — ніколи не поза платформою." },
    { title: "Повідомляйте про підозріле", text: "Поскаржтесь на оголошення чи користувача — команда підтримки MultiMart перевірить сигнал." },
];

const SecurityPage: React.FC = () => {
    return (
        <div className="bg-white">
            <section className="bg-mm-navy">
                <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-10 text-center">
                    <SafetyCertificateOutlined className="text-4xl text-mm-orange mb-3" />
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">Безпека на MultiMart</h1>
                    <p className="text-white/70 text-sm md:text-base max-w-2xl mx-auto">
                        Поради, які допоможуть безпечно купувати та продавати — розпізнавати шахрайство,
                        захищати особисті дані та впевнено домовлятися з іншими користувачами.
                    </p>
                </div>
            </section>

            <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-10">
                <section className="mb-12">
                    <h2 className="text-xl font-bold text-mm-navy mb-5">Основні правила безпечної угоди</h2>
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
                    <h2 className="text-xl font-bold text-mm-navy mb-5">5 кроків до безпечної угоди</h2>
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
                        <WarningOutlined className="text-mm-orange" /> Ознаки шахрайства
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
                        <LockOutlined className="text-mm-purple" /> Захист персональних даних
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                        <p className="bg-white border border-gray-100 rounded-xl p-4 leading-relaxed">
                            Не публікуйте в оголошеннях паспортні дані, повну домашню адресу чи реквізити картки.
                            Для доставки достатньо населеного пункту та відділення — точна адреса передається
                            лише службі доставки, а не іншому користувачу напряму.
                        </p>
                        <p className="bg-white border border-gray-100 rounded-xl p-4 leading-relaxed">
                            MultiMart ніколи не просить пароль, код з SMS чи повний номер картки в листах,
                            дзвінках або чаті. Будь-яке таке прохання — це фішинг, навіть якщо співрозмовник
                            представляється «службою підтримки».
                        </p>
                    </div>
                </section>

                <section className="bg-mm-navy rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                            <CheckCircleOutlined className="text-green-400" /> Помітили щось підозріле?
                        </h2>
                        <p className="text-white/70 text-sm max-w-lg">
                            Поскаржтесь на оголошення чи користувача, або зверніться до підтримки — ми перевіримо
                            звернення та вживемо заходів.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                        <Link
                            to="/chat"
                            className="flex items-center justify-center gap-2 bg-mm-purple hover:bg-mm-purple-dark text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors"
                        >
                            <MessageOutlined /> Написати в підтримку
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
                    Також перегляньте{" "}
                    <Link to="/delivery-safety" className="text-mm-purple hover:underline">безпеку доставки</Link>{" "}
                    та{" "}
                    <Link to="/delivery-rules" className="text-mm-purple hover:underline">правила доставки Новою поштою</Link>.
                </p>
            </div>
        </div>
    );
};

export default SecurityPage;
