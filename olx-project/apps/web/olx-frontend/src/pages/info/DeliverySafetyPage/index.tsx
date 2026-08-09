import React from "react";
import { Link } from "react-router-dom";
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

const PICKUP_STEPS: { title: string; text: string }[] = [
    { title: "Звірте номер ЕН", text: "Порівняйте номер експрес-накладної на посилці з номером у чаті замовлення/SMS від Нової пошти — вони мають повністю збігатися." },
    { title: "Огляньте упаковку до отримання", text: "Перевірте цілісність коробки/пакування ще на відділенні: розриви, вм'ятини, сліди розкриття або перепакування — привід скласти акт." },
    { title: "Розкривайте при співробітнику відділення", text: "Маєте право розкрити посилку у відділенні до підписання документів, щоб перевірити вміст і відповідність замовленню." },
    { title: "Складіть акт при пошкодженні", text: "Якщо вміст пошкоджено або не відповідає опису — не підписуйте отримання без акту про пошкодження, складеного співробітником відділення." },
    { title: "Зберігайте підтвердження", text: "Фото/відео розпакування та чек оплати накладеного платежу знадобляться, якщо доведеться звертатися у службу підтримки." },
];

const MAIL_SECURITY_TIPS: string[] = [
    "Не повідомляйте нікому код підтвердження з SMS від Нової пошти чи MultiMart — це особистий код доступу до посилки.",
    "Офіційні повідомлення про статус посилки надходять лише від Нової пошти напряму — не переходьте за посиланнями з підозрілих SMS «про митні платежі».",
    "Не сплачуйте додаткові «збори за розмитнення» чи «страховку» через сторонні сайти — усі платежі за відправлення оплачуються лише на відділенні або в застосунку перевізника.",
    "Отримувати посилку може лише той, чиї дані вказані в накладній, або довірена особа з документом і довіреністю.",
    "Перевіряйте, що номер телефону та ПІБ отримувача в замовленні — ваші власні, а не сторонньої особи, якій ви не довіряєте.",
];

const RED_FLAGS: string[] = [
    "Дзвінок/SMS з проханням «підтвердити» переказ або назвати код з SMS для «отримання» посилки",
    "Вимога доплатити за доставку на карту приватній особі, а не в офіційній квитанції",
    "Номер ЕН, який не знаходиться в офіційному застосунку/на сайті Нової пошти",
    "Відправник наполягає забрати посилку без огляду вмісту",
];

const DeliverySafetyPage: React.FC = () => {
    return (
        <div className="bg-white">
            <section className="bg-mm-navy">
                <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-10 text-center">
                    <SafetyOutlined className="text-4xl text-mm-orange mb-3" />
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">Безпека доставки</h1>
                    <p className="text-white/70 text-sm md:text-base max-w-2xl mx-auto">
                        Як безпечно отримати посилку від Нової пошти та розпізнати шахрайство,
                        пов'язане з доставкою.
                    </p>
                </div>
            </section>

            <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-10">
                <section className="mb-12">
                    <h2 className="text-xl font-bold text-mm-navy mb-5 flex items-center gap-2">
                        <EyeOutlined className="text-mm-purple" /> Перевірка посилки при отриманні
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
                        <h3 className="text-sm font-bold text-mm-navy mb-1">Звіряйте ЕН</h3>
                        <p className="text-xs text-gray-500">Номер накладної має збігатись з чатом замовлення.</p>
                    </div>
                    <div className="bg-mm-lavender-light border border-purple-100 rounded-xl p-4 text-center">
                        <CameraOutlined className="text-2xl text-mm-purple mb-2" />
                        <h3 className="text-sm font-bold text-mm-navy mb-1">Знімайте розпакування</h3>
                        <p className="text-xs text-gray-500">Відео стане доказом у разі спору щодо вмісту.</p>
                    </div>
                    <div className="bg-mm-lavender-light border border-purple-100 rounded-xl p-4 text-center">
                        <LockOutlined className="text-2xl text-mm-purple mb-2" />
                        <h3 className="text-sm font-bold text-mm-navy mb-1">Не діліться кодами</h3>
                        <p className="text-xs text-gray-500">Код з SMS призначений лише для вас.</p>
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="text-xl font-bold text-mm-navy mb-5">Рекомендації поштової безпеки</h2>
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
                        <WarningOutlined className="text-mm-orange" /> Ознаки шахрайства з доставкою
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
                        <h2 className="text-lg font-bold text-white mb-2">Посилку пошкоджено або загублено?</h2>
                        <p className="text-white/70 text-sm max-w-lg">
                            Зверніться до відділення Нової пошти для складання акту, а також повідомте продавця
                            у чаті замовлення — MultiMart допоможе врегулювати спір.
                        </p>
                    </div>
                    <a
                        href="tel:0800500609"
                        className="flex items-center justify-center gap-2 bg-mm-purple hover:bg-mm-purple-dark text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors shrink-0"
                    >
                        <PhoneOutlined /> Нова пошта: 0 800 500 609
                    </a>
                </section>

                <p className="text-xs text-gray-400 text-center mt-8">
                    Дізнайтеся більше про{" "}
                    <Link to="/delivery-rules" className="text-mm-purple hover:underline">правила доставки</Link>{" "}
                    та{" "}
                    <Link to="/security" className="text-mm-purple hover:underline">безпеку угод на MultiMart</Link>.
                </p>
            </div>
        </div>
    );
};

export default DeliverySafetyPage;
