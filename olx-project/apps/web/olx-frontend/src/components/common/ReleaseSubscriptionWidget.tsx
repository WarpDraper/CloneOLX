import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { MailOutlined, CheckCircleFilled, BellOutlined } from "@ant-design/icons";
import type { RootState } from "../../store";
import { addNotification } from "../../store/notificationSlice";
import { savePendingSubscriptionIntent, consumePendingSubscriptionIntent } from "../../utils/subscriptionIntent";
import { useNewsletterToggle } from "../../hooks/useNewsletterToggle";

// "Підписка на оновлення MultiMart" — homepage release-announcement / newsletter widget.
//
// Logged in: a single one-click toggle button, backed by the real OlxUser.NewsletterSubscribed
// flag (POST /api/account/subscribe, via useNewsletterToggle — the same hook SettingsPage's
// toggle uses, so the two stay in sync automatically). No email field: there's nothing to type,
// the subscription is tied to the signed-in account.
//
// Logged out: subscribing requires an account, so a guest gets a one-click "sign in to
// subscribe" CTA instead of a real form. The intent survives the redirect to /login (via
// subscriptionIntent.ts) and completes automatically against the real backend once the user is
// back here authenticated — no email capture, no local-storage-only fake subscription.
const ReleaseSubscriptionWidget: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuth } = useSelector((state: RootState) => state.auth);
    const { subscribed, toggle, isLoading } = useNewsletterToggle();

    // Guards the auto-completion effect below against re-firing more than once per mount
    // (e.g. if `toggle`'s identity changes across renders once isAuth flips to true).
    const hasResumedRef = useRef(false);

    const handleToggle = async () => {
        try {
            const nowSubscribed = await toggle(!subscribed);
            dispatch(addNotification({
                type: "success",
                title: t('newsletterWidget.notificationTitle'),
                message: nowSubscribed ? t('newsletterWidget.subscribedMessage') : t('newsletterWidget.unsubscribedMessage'),
            }));
        } catch {
            dispatch(addNotification({
                type: "error",
                title: t('newsletterWidget.notificationTitle'),
                message: t('newsletterWidget.toggleFailed'),
            }));
        }
    };

    // Resume an interrupted guest subscription: runs once auth flips to true (right after the
    // /login redirect completes) so the user never has to click twice after signing in.
    useEffect(() => {
        if (!isAuth || hasResumedRef.current) return;
        if (!consumePendingSubscriptionIntent()) return;
        hasResumedRef.current = true;
        const timer = window.setTimeout(() => {
            void handleToggle();
        }, 0);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuth]);

    const handleGuestClick = () => {
        savePendingSubscriptionIntent();
        navigate("/login", { state: { from: location.pathname } });
    };

    if (isAuth && subscribed) {
        return (
            <section className="max-w-[1280px] mx-auto px-4 md:px-6 pb-12">
                <div className="rounded-2xl bg-mm-navy px-6 py-8 md:px-10 md:py-10 flex flex-col items-center text-center gap-3">
                    <CheckCircleFilled className="text-3xl text-mm-orange" />
                    <h2 className="text-lg md:text-xl font-bold text-white">{t('newsletterWidget.thankYouTitle')}</h2>
                    <p className="text-white/70 text-sm max-w-md">{t('newsletterWidget.thankYouDescription')}</p>
                    <button
                        type="button"
                        onClick={handleToggle}
                        disabled={isLoading}
                        className="mt-2 text-white/60 hover:text-white text-xs font-semibold underline disabled:opacity-50"
                    >
                        {t('newsletterWidget.unsubscribeButton')}
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="max-w-[1280px] mx-auto px-4 md:px-6 pb-12">
            <div className="rounded-2xl bg-mm-navy px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                    <h2 className="text-lg md:text-xl font-bold text-white">{t('newsletterWidget.heading')}</h2>
                    <p className="text-white/70 text-sm mt-1 max-w-md">{t('newsletterWidget.description')}</p>
                </div>
                <button
                    type="button"
                    onClick={isAuth ? handleToggle : handleGuestClick}
                    disabled={isLoading}
                    className="h-11 px-6 rounded-lg bg-mm-orange hover:bg-orange-500 text-white font-bold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center gap-2"
                >
                    {isAuth ? <BellOutlined /> : <MailOutlined />}
                    {isLoading ? t('newsletterWidget.submitting') : t('newsletterWidget.subscribeButton')}
                </button>
            </div>
        </section>
    );
};

export default ReleaseSubscriptionWidget;
