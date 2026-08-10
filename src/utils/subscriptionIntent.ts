// "Intent" persisted across the guest -> /login -> back-again round trip for the release
// newsletter widget (ReleaseSubscriptionWidget.tsx). Separate from returnUrl.ts's plain page
// redirect: this also remembers *what the user was trying to do* (subscribe with this email)
// so the widget can finish the action automatically after login instead of just landing the
// user back on the page with an empty form.
const PENDING_SUBSCRIPTION_KEY = "pendingNewsletterSubscriptionEmail";

export const savePendingSubscription = (email: string): void => {
    sessionStorage.setItem(PENDING_SUBSCRIPTION_KEY, email);
};

/** One-shot read: returns the pending email (if any) and clears it so it can't replay twice. */
export const consumePendingSubscription = (): string | null => {
    const email = sessionStorage.getItem(PENDING_SUBSCRIPTION_KEY);
    sessionStorage.removeItem(PENDING_SUBSCRIPTION_KEY);
    return email;
};
