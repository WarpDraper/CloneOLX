import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    MessageOutlined,
    HeartOutlined,
    BellOutlined,
    UserOutlined,
    ShoppingCartOutlined,
} from '@ant-design/icons';
import { Badge, Popover, Typography, Button } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import type { RootState } from '../../store';
import { markAsRead, markAllAsRead } from '../../store/notificationSlice';
import type { NotificationItem } from '../../store/notificationSlice';
import ImageWithFallback from '../../components/common/ImageWithFallback';

const Header: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { t, i18n } = useTranslation();
    const language = i18n.language === 'en' ? 'eng' : 'ukr';
    const setLanguage = (next: 'ukr' | 'eng') => i18n.changeLanguage(next === 'eng' ? 'en' : 'uk');
    const { items } = useSelector((state: RootState) => state.notifications);

    const NAV_ITEMS = [
        { icon: MessageOutlined, label: t('header.nav.chats'), to: '/chat' },
        { icon: BellOutlined, label: t('header.nav.notifications'), isNotification: true },
        { icon: ShoppingCartOutlined, label: t('header.nav.cart'), to: '/cart', isCart: true },
        { icon: HeartOutlined, label: t('header.nav.favorites'), to: '/favorites' },
        { icon: UserOutlined, label: t('header.nav.profile'), isProfile: true },
    ];

    // ДОДАЄМО: витягуємо дані користувача (user) з auth slice
    const { isAuth, user } = useSelector((state: RootState) => state.auth);

    const isAdmin = isAuth && user?.role === 'Admin';

    const unreadCount = items.filter((n: NotificationItem) => !n.read).length;
    const cartCount = useSelector((state: RootState) => state.cart.items.reduce((n, i) => n + i.quantity, 0));
    // Cart persists in localStorage independent of auth; never surface a leftover/hardcoded count to a logged-out user.
    const displayCartCount = isAuth ? cartCount : 0;

    const notificationContent = (
        <div className="w-80 max-h-96 flex flex-col">
            <div className="flex justify-between items-center mb-2 px-4 shadow-sm pb-2">
                <span className="font-bold text-mm-navy">{t('header.notificationsPanel.title')}</span>
                {unreadCount > 0 && (
                    <Button type="link" size="small" onClick={() => dispatch(markAllAsRead())}>
                        {t('header.notificationsPanel.markAllRead')}
                    </Button>
                )}
            </div>
            <div className="overflow-y-auto overflow-x-hidden flex-1">
                {items.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">{t('header.notificationsPanel.empty')}</div>
                ) : (
                    <div className="flex flex-col divide-y divide-gray-100">
                        {items.map((item: NotificationItem) => (
                            <div
                                key={item.id}
                                className={`cursor-pointer hover:bg-gray-50 transition-colors px-4 py-2.5 ${!item.read ? 'bg-purple-50/50' : ''}`}
                                onClick={() => {
                                    if (!item.read) dispatch(markAsRead(item.id));
                                }}
                            >
                                <div className="flex flex-col w-full">
                                    <div className="flex justify-between items-start">
                                        <Typography.Text strong className="text-mm-navy text-sm">{item.title}</Typography.Text>
                                        {!item.read && <div className="w-2 h-2 rounded-full bg-mm-purple mt-1 flex-shrink-0" />}
                                    </div>
                                    <Typography.Text type="secondary" className="text-xs mt-1 leading-tight">{item.message}</Typography.Text>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
            <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
                <Link to="/" className="flex items-center gap-2.5 shrink-0">
                    <img src="/images/multimart/logo.svg" alt="MultiMart" className="w-10 h-10" />
                    <span className="text-2xl font-bold text-mm-navy tracking-tight">MultiMart</span>
                </Link>

                <div className="hidden lg:flex items-center gap-4 text-sm font-medium text-gray-600">
                    <Link to="/about" className="hover:text-mm-purple transition-colors">{t('header.aboutUs')}</Link>
                    <Link to="/terms" className="hover:text-mm-purple transition-colors">{t('header.terms')}</Link>
                </div>

                <div className="hidden md:flex items-center rounded-full overflow-hidden border border-gray-200 text-sm font-semibold">
                    <button
                        type="button"
                        onClick={() => setLanguage('ukr')}
                        aria-pressed={language === 'ukr'}
                        className={`px-4 py-1.5 transition-colors ${language === 'ukr' ? 'bg-mm-purple text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                        {t('header.langUk')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setLanguage('eng')}
                        aria-pressed={language === 'eng'}
                        className={`px-4 py-1.5 transition-colors ${language === 'eng' ? 'bg-mm-orange text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                        {t('header.langEn')}
                    </button>
                </div>

                <div className="flex items-center gap-4 md:gap-6">
                    {NAV_ITEMS.map(({ icon: Icon, label, isNotification, isCart, isProfile, to }) => {

                        const currentLabel = isProfile && isAuth ? (user?.name || t('header.nav.profile')) : label;

                        const content = (
                            <div className="flex flex-col items-center gap-1 cursor-pointer group min-w-[52px]">
                                {isNotification ? (
                                    <Badge count={unreadCount} size="small" offset={[-2, 2]}>
                                        <div className="w-10 h-10 rounded-full bg-mm-lavender flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                                            <Icon className="text-lg text-mm-purple" />
                                        </div>
                                    </Badge>
                                ) : isCart ? (
                                    <Badge count={displayCartCount} size="small" offset={[-2, 2]}>
                                        <div className="w-10 h-10 rounded-full bg-mm-lavender flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                                            <Icon className="text-lg text-mm-purple" />
                                        </div>
                                    </Badge>
                                ) : isProfile && isAuth && user?.avatarUrl ? (
                                    <ImageWithFallback
                                        src={user.avatarUrl}
                                        alt="User avatar"
                                        className="w-10 h-10 rounded-full object-cover border border-purple-100 group-hover:opacity-85 transition-opacity"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-mm-lavender flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                                        <Icon className="text-lg text-mm-purple" />
                                    </div>
                                )}
                                <span className="text-[11px] font-medium text-gray-600 hidden sm:block truncate max-w-[75px] text-center">
                  {currentLabel}
                </span>
                            </div>
                        );

                        if (isNotification) {
                            return (
                                <Popover key={label} content={notificationContent} trigger="click" placement="bottom">
                                    {content}
                                </Popover>
                            );
                        }

                        if (isProfile) {
                            return (
                                <Link key={label} to={isAuth ? '/profile' : '/login'} className="text-inherit no-underline">
                                    {content}
                                </Link>
                            );
                        }

                        if (to) {
                            return (
                                <Link key={label} to={isAuth ? to : '/login'} className="text-inherit no-underline">
                                    {content}
                                </Link>
                            );
                        }

                        return <div key={label}>{content}</div>;
                    })}

                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() => navigate('/admin')}
                            className="bg-mm-navy hover:bg-slate-800 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap shadow-sm"
                        >
                            {t('header.adminPanel')}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => navigate(isAuth ? '/adverts/create' : '/login')}
                        className="bg-mm-orange hover:bg-orange-500 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap shadow-sm"
                    >
                        {t('header.addAdvert')}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;