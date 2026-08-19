// "Intent" persisted across the guest -> /login -> back-again round trip for the release
// newsletter widget (ReleaseSubscriptionWidget.tsx). Separate from returnUrl.ts's plain page
// redirect: this also remembers *that the user was trying to subscribe* so the widget can
// finish the action automatically (POST /api/account/subscribe) after login instead of just
// landing the user back on the page having to click again.
//
// A boolean flag, not an email: subscription is tied to the now-authenticated account
// (OlxUser.NewsletterSubscribed), the backend endpoint doesn't take an email at all.
const PENDING_SUBSCRIPTION_KEY = "pendingNewsletterSubscriptionIntent";

export const savePendingSubscriptionIntent = (): void => {
    sessionStorage.setItem(PENDING_SUBSCRIPTION_KEY, "1");
};

/** One-shot read: returns whether a subscription was pending, and clears it so it can't replay twice. */
export const consumePendingSubscriptionIntent = (): boolean => {
    const had = sessionStorage.getItem(PENDING_SUBSCRIPTION_KEY) === "1";
    sessionStorage.removeItem(PENDING_SUBSCRIPTION_KEY);
    return had;
};
