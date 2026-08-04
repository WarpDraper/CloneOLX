import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { UserOutlined, HeartOutlined, MessageOutlined, LogoutOutlined, SettingOutlined } from "@ant-design/icons";
import type { RootState } from "../../store";
import { logout } from "../../Slice/authSlice";

const NAV_ITEMS = [
    { to: "/profile", label: "Кабінет", icon: UserOutlined },
    { to: "/favorites", label: "Обране", icon: HeartOutlined },
    { to: "/chat", label: "Чати", icon: MessageOutlined },
    { to: "/settings", label: "Налаштування", icon: SettingOutlined },
];

// Бічна навігація особистого кабінету (Frame 335) — використовується на сторінці "Обране"
// та може перевикористовуватись на інших сторінках кабінету користувача.
const AccountSidebar: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);

    const handleLogout = () => {
        dispatch(logout());
        navigate("/login");
    };

    return (
        <aside className="w-full md:w-60 shrink-0 bg-white border border-gray-100 rounded-xl p-4 h-fit">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="w-11 h-11 rounded-full bg-mm-lavender flex items-center justify-center overflow-hidden shrink-0">
                    {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                        <UserOutlined className="text-mm-purple" />
                    )}
                </div>
                <p className="text-sm font-semibold text-mm-navy truncate">{user?.name || "Користувач"}</p>
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
                    Вийти
                </button>
            </nav>
        </aside>
    );
};

export default AccountSidebar;
