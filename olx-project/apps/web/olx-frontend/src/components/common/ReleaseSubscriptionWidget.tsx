import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { MailOutlined, CheckCircleFilled } from "@ant-design/icons";
import type { RootState } from "../../store";
import { addNotification } from "../../store/notificationSlice";
import { savePendingSubscription, consumePendingSubscription } from "../../utils/subscriptionIntent";
import { subscribeToReleaseNewsletter, isSubscribedToReleaseNewsletter } from "../../services/newsletterSubscription";

// "Підписка на оновлення MultiMart" — homepage release-announcement / newsletter widget.
//
// Auth preservation flow: a logged-in user subscribes immediately. A guest is redirected to
// /login with `state: { from: location.pathname } }` (LoginForm.tsx reads `location.state.from`
// and prefers it over the generic returnUrl fallback) instead of losing the email they typed —
// the address is stashed via subscriptionIntent.ts first. On landing back on this page already
// authenticated, the pending subscription is detected and completed automatically, no re-typing
// or re-clicking required.
const ReleaseSubscriptionWidget: React.FC = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuth } = useSelector((state: RootState) => state.auth);

    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [subscribed, setSubscribed] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const completeSubscription = async (targetEmail: string) => {
        setSubmitting(true);
        setError(null);
        try {
            await subscribeToReleaseNewsletter(targetEmail);
            setSubscribed(true);
            dispatch(addNotification({
                type: "success",
                title: "Підписку оформлено",
                message: `Ми надсилатимемо новини про оновлення MultiMart на ${targetEmail}.`,
            }));
        } finally {
            setSubmitting(false);
        }
    };

    // Resume an interrupted guest subscription: runs once on mount (and whenever auth flips to
    // true, e.g. right after the /login redirect completes) so the user never has to retype
    // their email after signing in. Deferred via setTimeout(0) rather than calling
    // completeSubscription (which setState's immediately) synchronously in the effect body —
    // avoids the cascading-render footgun react-hooks/set-state-in-effect warns about.
    useEffect(() => {
        if (!isAuth) return;
        const pendingEmail = consumePendingSubscription();
        if (!pendingEmail || isSubscribedToReleaseNewsletter(pendingEmail)) return;
        const timer = window.setTimeout(() => {
            void completeSubscription(pendingEmail);
        }, 0);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuth]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = email.trim();
        if (!trimmed || !trimmed.includes("@")) {
            setError("Введіть коректний email.");
            return;
        }
        setError(null);

        if (!isAuth) {
            // Guest: preserve the typed email + current location, then send to /login. The
            // subscription itself only happens once we're back here authenticated (see the
            // effect above) — never fired for an unauthenticated visitor.
            savePendingSubscription(trimmed);
            navigate("/login", { state: { from: location.pathname } });
            return;
        }

        void completeSubscription(trimmed);
    };

    if (subscribed) {
        return (
            <section className="max-w-[1280px] mx-auto px-4 md:px-6 pb-12">
                <div className="rounded-2xl bg-mm-navy px-6 py-8 md:px-10 md:py-10 flex flex-col items-center text-center gap-3">
                    <CheckCircleFilled className="text-3xl text-mm-orange" />
                    <h2 className="text-lg md:text-xl font-bold text-white">Дякуємо за підписку!</h2>
                    <p className="text-white/70 text-sm max-w-md">
                        Ви будете отримувати новини про оновлення MultiMart першими.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="max-w-[1280px] mx-auto px-4 md:px-6 pb-12">
            <div className="rounded-2xl bg-mm-navy px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                    <h2 className="text-lg md:text-xl font-bold text-white">Підписка на оновлення MultiMart</h2>
                    <p className="text-white/70 text-sm mt-1 max-w-md">
                        Дізнавайтесь першими про нові функції та релізи.
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="w-full md:w-auto flex flex-col gap-2">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative">
                            <MailOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Ваш email"
                                className="w-full sm:w-72 h-11 pl-9 pr-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-1 focus:ring-mm-orange focus:border-mm-orange transition-colors"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="h-11 px-6 rounded-lg bg-mm-orange hover:bg-orange-500 text-white font-bold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                            {submitting ? "Зачекайте..." : "Підписатися"}
                        </button>
                    </div>
                    {error && <p className="text-red-300 text-xs">{error}</p>}
                </form>
            </div>
        </section>
    );
};

export default ReleaseSubscriptionWidget;
