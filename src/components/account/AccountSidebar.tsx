import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { UserOutlined, HeartOutlined, MessageOutlined, LogoutOutlined, SettingOutlined } from "@ant-design/icons";
import type { RootState } from "../../store";
import { logout } from "../../Slice/authSlice";
import ImageWithFallback from "../common/ImageWithFallback";

// Бічна навігація особистого кабінету (Frame 335) — використовується на сторінці "Обране"
// та може перевикористовуватись на інших сторінках кабінету користувача.
const AccountSidebar: React.FC = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);

    const NAV_ITEMS = [
        { to: "/profile", label: t('accountSidebar.nav.profile'), icon: UserOutlined },
        { to: "/favorites", label: t('accountSidebar.nav.favorites'), icon: HeartOutlined },
        { to: "/chat", label: t('accountSidebar.nav.chats'), icon: MessageOutlined },
        { to: "/settings", label: t('accountSidebar.nav.settings'), icon: SettingOutlined },
    ];

    const handleLogout = () => {
        dispatch(logout());
        navigate("/login");
    };

    return (
        <aside className="w-full md:w-60 shrink-0 bg-white border border-gray-100 rounded-xl p-4 h-fit">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="relative w-11 h-11 rounded-full bg-mm-lavender flex items-center justify-center overflow-hidden shrink-0 aspect-square">
                    <ImageWithFallback
                        src={user?.avatarUrl}
                        alt={user?.name || t('accountSidebar.defaultUserName')}
                        className="w-full h-full object-cover"
                        fallback={<UserOutlined className="text-mm-purple" />}
                    />
                </div>
                <p className="text-sm font-semibold text-mm-navy truncate">{user?.name || t('accountSidebar.defaultUserName')}</p>
            </div>

            <nav className="flex flex-col gap-1">
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
                    const active = location.pathname === to;
                    return (
                        <Link
                            key={to}
                            to={to}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                active ? "bg-mm-lavender text-mm-purple" : "text-gray-600 hover:bg-gray-50"
                            }`}
                        >
                            <Icon />
                            {label}
                        </Link>
                    );
                })}
                <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors text-left"
                >
                    <LogoutOutlined />
                    {t('common.logout')}
                </button>
            </nav>
        </aside>
    );
};

export default AccountSidebar;
