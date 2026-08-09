import React from "react";
import { Link } from "react-router-dom";
import { MobileOutlined, AppleOutlined, AndroidOutlined, BellOutlined } from "@ant-design/icons";

// /app-coming-soon — branded teaser page explaining that the MultiMart mobile app is
// currently under development. Linked from the "Детальніше" button on the home page's
// standalone app banner (see UserHomePage/index.tsx).
const AppComingSoonPage: React.FC = () => {
    return (
        <div className="bg-mm-navy min-h-[70vh] relative overflow-hidden flex items-center">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-mm-purple blur-3xl" />
                <div className="absolute -bottom-16 -right-16 w-80 h-80 rounded-full bg-mm-orange blur-3xl" />
            </div>

            <div className="max-w-[700px] mx-auto px-4 md:px-6 py-16 text-center relative z-10">
                <div className="w-24 h-24 mx-auto rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center mb-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <MobileOutlined className="text-5xl text-mm-orange" />
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
                    Додаток MultiMart вже в розробці
                </h1>
                <p className="text-white/70 text-sm md:text-base max-w-lg mx-auto mb-8 leading-relaxed">
                    Ми працюємо над мобільним застосунком для iOS та Android, щоб купувати й продавати на
                    MultiMart було ще зручніше. Слідкуйте за оновленнями — реліз незабаром.
                </p>

                <div className="flex flex-wrap justify-center gap-3 mb-10">
                    <div className="flex items-center gap-2 bg-white/10 border border-white/20 text-white/60 text-sm font-semibold px-5 py-2.5 rounded-lg cursor-not-allowed">
                        <AppleOutlined className="text-base" /> App Store · скоро
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 border border-white/20 text-white/60 text-sm font-semibold px-5 py-2.5 rounded-lg cursor-not-allowed">
                        <AndroidOutlined className="text-base" /> Google Play · скоро
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                        type="button"
                        className="flex items-center gap-2 bg-mm-orange hover:bg-orange-500 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-all duration-300 hover:-translate-y-1 shadow-sm"
                    >
                        <BellOutlined /> Повідомити про реліз
                    </button>
                    <Link
                        to="/"
                        className="bg-white/10 hover:bg-white/20 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-all duration-300 hover:-translate-y-1"
                    >
                        Повернутися на головну
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AppComingSoonPage;
