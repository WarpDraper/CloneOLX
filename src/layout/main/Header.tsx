import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    MessageOutlined,
    HeartOutlined,
    BellOutlined,
    UserOutlined,
    ShoppingCartOutlined,
    MenuOutlined,
    CloseOutlined,
} from '@ant-design/icons';
import { Badge, Popover, Typography, Button, Tooltip } from 'antd';
import { Shield } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import type { RootState } from '../../store';
import {
    useGetTopUnreadQuery,
    useMarkAsReadMutation,
    useMarkAllAsReadMutation,
} from '../../services/notificationService';
import type { INotification } from '../../services/notificationService';
import ImageWithFallback from '../../components/common/ImageWithFallback';

const Header: React.FC = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const language = i18n.language === 'en' ? 'eng' : 'ukr';
    const setLanguage = (next: 'ukr' | 'eng') => i18n.changeLanguage(next === 'eng' ? 'en' : 'uk');

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

    // DB-persisted notifications (see services/notificationService.ts) — top 3 unread + true
    // unread total in one round-trip, refetched on focus/mount by RTK Query's default caching.
    const { data: topUnread } = useGetTopUnreadQuery(3, { skip: !isAuth });
    const [markAsRead] = useMarkAsReadMutation();
    const [markAllAsRead] = useMarkAllAsReadMutation();
    const notificationItems = topUnread?.items ?? [];
    const unreadCount = topUnread?.unreadCount ?? 0;

    const cartCount = useSelector((state: RootState) => state.cart.items.reduce((n, i) => n + i.quantity, 0));
    // Cart persists in localStorage independent of auth; never surface a leftover/hardcoded count to a logged-out user.
    const displayCartCount = isAuth ? cartCount : 0;

    // Мобільне меню
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);

    const handleNotificationItemClick = (item: INotification) => {
        if (!item.isRead) markAsRead(item.id);
        if (item.targetUrl) navigate(item.targetUrl);
        else navigate('/notifications');
    };

    const notificationContent = (
        <div className="w-[calc(100vw-2rem)] sm:w-80 max-h-96 flex flex-col">
            <div className="flex justify-between items-center mb-2 px-4 shadow-sm pb-2">
                <span className="font-bold text-mm-navy">{t('header.notificationsPanel.title')}</span>
                {unreadCount > 0 && (
                    <Button type="link" size="small" onClick={() => markAllAsRead()}>
                        {t('header.notificationsPanel.markAllRead')}
                    </Button>
                )}
            </div>
            <div className="overflow-y-auto overflow-x-hidden flex-1">
                {notificationItems.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">{t('header.notificationsPanel.empty')}</div>
                ) : (
                    <div className="flex flex-col divide-y divide-gray-100">
                        {notificationItems.map((item) => (
                            <div
                                key={item.id}
                                className={`cursor-pointer hover:bg-gray-50 transition-colors px-4 py-2.5 ${!item.isRead ? 'bg-purple-50/50' : ''}`}
                                onClick={() => handleNotificationItemClick(item)}
                            >
                                <div className="flex flex-col w-full">
                                    <div className="flex justify-between items-start">
                                        <Typography.Text strong className="text-mm-navy text-sm">{item.title}</Typography.Text>
                                        {!item.isRead && <div className="w-2 h-2 rounded-full bg-mm-purple mt-1 flex-shrink-0" />}
                                    </div>
                                    <Typography.Text type="secondary" className="text-xs mt-1 leading-tight">{item.message}</Typography.Text>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="px-4 pt-2 mt-1 border-t border-gray-100">
                <Link
                    to="/notifications"
                    className="block text-center text-sm font-medium text-mm-purple hover:text-purple-700 transition-colors py-1"
                >
                    {t('header.notificationsPanel.viewAll')}
                </Link>
            </div>
        </div>
    );

    return (
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
            <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-2 lg:gap-3 xl:gap-4 overflow-hidden">
                <Link to="/" className="flex items-center gap-2.5 shrink-0">
                    <img src="/images/multimart/logo.svg" alt="MultiMart" className="w-10 h-10" />
                    <span className="text-2xl font-bold text-mm-navy tracking-tight">Multi
                        <span className="text-mm-purple">Mart</span>
                    </span>
                </Link>

                {/* Secondary links/switcher: kept on the SAME breakpoint (lg) as the icon nav
                    row and the burger toggle below. Previously these used `xl` while the icon
                    row + burger used `lg`, so on any viewport between 1024px and 1279px (most
                    tablets/small laptops) these were hidden by the `xl` rule AND the burger that
                    could have revealed them was already hidden by the `lg` rule — vanishing with
                    no way to reach them. */}
                <div className="hidden lg:flex items-center gap-3 xl:gap-4 text-sm font-medium text-gray-600 shrink-0">
                    <Link to="/about" className="hover:text-mm-purple transition-colors whitespace-nowrap">{t('header.aboutUs')}</Link>
                    <Link to="/terms" className="hover:text-mm-purple transition-colors whitespace-nowrap">{t('header.terms')}</Link>
                </div>

                <div className="hidden lg:flex items-center rounded-full overflow-hidden border border-gray-200 text-sm font-semibold shrink-0">
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

                <div className="hidden lg:flex items-center gap-2 xl:gap-4 shrink-0">
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
                                    <div className="relative w-10 h-10 aspect-square rounded-full overflow-hidden shrink-0 border border-purple-100 group-hover:opacity-85 transition-opacity">
                                        <ImageWithFallback
                                            src={user.avatarUrl}
                                            alt="User avatar"
                                            className="w-full h-full object-cover object-center scale-110"
                                        />
                                    </div>
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
                                <Popover key={label} content={notificationContent} trigger="hover" placement="bottom">
                                    <div onClick={() => navigate(isAuth ? '/notifications' : '/login')}>
                                        {content}
                                    </div>
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
                        <Tooltip title={t('header.adminPanel')} placement="bottom">
                            <button
                                type="button"
                                onClick={() => navigate('/admin')}
                                aria-label={t('header.adminPanel')}
                                className="relative w-10 h-10 shrink-0 rounded-full bg-mm-navy hover:bg-slate-800 text-white flex items-center justify-center transition-colors shadow-sm"
                            >
                                <Shield size={18} strokeWidth={2} />
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-mm-orange border-2 border-white" />
                            </button>
                        </Tooltip>
                    )}

                    {/* Admins manage the marketplace but never post adverts as themselves —
                        the backend rejects POST /api/Advert/create for the Admin role (see
                        AdvertController.Create), so hide the entry point rather than let an
                        admin hit a confusing 403 on submit. */}
                    {!isAdmin && (
                        <button
                            type="button"
                            onClick={() => navigate(isAuth ? '/adverts/create' : '/login')}
                            className="bg-mm-orange hover:bg-orange-500 text-white font-bold text-sm px-3 xl:px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap shadow-sm shrink-0"
                        >
                            {t('header.addAdvert')}
                        </button>
                    )}
                </div>

                <div className="lg:hidden flex items-center gap-2">
                    <button
                        type="button"
                        onClick={toggleMobileMenu}
                        className="w-10 h-10 rounded-full bg-mm-lavender flex items-center justify-center text-mm-purple"
                    >
                        {isMobileMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
                    </button>
                </div>
            </div>

            {isMobileMenuOpen && (
                <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-3 max-h-[calc(100vh-64px)] overflow-y-auto">
                    <div className="flex items-center rounded-full overflow-hidden border border-gray-200 text-sm font-semibold self-start">
                        <button
                            type="button"
                            onClick={() => setLanguage('ukr')}
                            aria-pressed={language === 'ukr'}
                            className={`px-4 py-1.5 ${language === 'ukr' ? 'bg-mm-purple text-white' : 'bg-white text-gray-600'}`}
                        >
                            {t('header.langUk')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setLanguage('eng')}
                            aria-pressed={language === 'eng'}
                            className={`px-4 py-1.5 ${language === 'eng' ? 'bg-mm-orange text-white' : 'bg-white text-gray-600'}`}
                        >
                            {t('header.langEn')}
                        </button>
                    </div>

                    {/* Про нас / Умови використання — previously only rendered at `xl:flex` in
                        the desktop bar with no mobile-drawer equivalent, so they were completely
                        unreachable below 1280px. */}
                    <div className="flex flex-col gap-1 text-sm font-medium text-gray-600 border-b border-gray-100 pb-3">
                        <Link to="/about" className="py-1 hover:text-mm-purple transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                            {t('header.aboutUs')}
                        </Link>
                        <Link to="/terms" className="py-1 hover:text-mm-purple transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                            {t('header.terms')}
                        </Link>
                    </div>

                    {NAV_ITEMS.map(({ icon: Icon, label, isNotification, isCart, isProfile, to }) => {
                        const currentLabel = isProfile && isAuth ? (user?.name || t('header.nav.profile')) : label;
                        const target = isProfile ? (isAuth ? '/profile' : '/login') : (to ? (isAuth ? to : '/login') : undefined);
                        const row = (
                            <div className="flex items-center gap-3 py-2 text-mm-navy">
                                {isNotification ? (
                                    <Badge count={unreadCount} size="small"><Icon className="text-lg text-mm-purple" /></Badge>
                                ) : isCart ? (
                                    <Badge count={displayCartCount} size="small"><Icon className="text-lg text-mm-purple" /></Badge>
                                ) : (
                                    <Icon className="text-lg text-mm-purple" />
                                )}
                                <span>{currentLabel}</span>
                            </div>
                        );
                        if (isNotification) {
                            return (
                                <Popover key={label} content={notificationContent} trigger="click" placement="bottom">
                                    {row}
                                </Popover>
                            );
                        }
                        if (target) {
                            return (
                                <Link key={label} to={target} className="text-inherit no-underline" onClick={() => setIsMobileMenuOpen(false)}>
                                    {row}
                                </Link>
                            );
                        }
                        return <div key={label}>{row}</div>;
                    })}
                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() => { setIsMobileMenuOpen(false); navigate('/admin'); }}
                            aria-label={t('header.adminPanel')}
                            className="flex items-center gap-3 py-2 text-mm-navy font-semibold"
                        >
                            <span className="w-10 h-10 rounded-full bg-mm-navy text-white flex items-center justify-center shrink-0">
                                <Shield size={18} strokeWidth={2} />
                            </span>
                            <span>{t('header.adminPanel')}</span>
                        </button>
                    )}
                    {!isAdmin && (
                        <button
                            type="button"
                            onClick={() => { setIsMobileMenuOpen(false); navigate(isAuth ? '/adverts/create' : '/login'); }}
                            className="bg-mm-orange text-white font-bold text-sm px-5 py-2.5 rounded-lg"
                        >
                            {t('header.addAdvert')}
                        </button>
                    )}
                </div>
            )}
        </header>
    );
};

export default Header;
