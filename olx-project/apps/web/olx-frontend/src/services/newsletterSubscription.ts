// No dedicated backend endpoint exists yet for release-announcement subscriptions (there's no
// "Newsletter"/"Subscription" controller in OLX.API) — this persists the opt-in locally so the
// widget's UX (subscribe once, see confirmation, don't get asked again) works end-to-end today.
// Swap the body of subscribeToReleaseNewsletter for a real API call once a backend endpoint exists;
// callers already treat it as async.
const SUBSCRIBED_EMAILS_KEY = "newsletter-subscribed-emails";

const readSubscribedEmails = (): string[] => {
    try {
        const raw = window.localStorage.getItem(SUBSCRIBED_EMAILS_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
        return [];
    }
};

export const isSubscribedToReleaseNewsletter = (email: string): boolean =>
    readSubscribedEmails().some((e) => e.toLowerCase() === email.toLowerCase());

export const subscribeToReleaseNewsletter = async (email: string): Promise<void> => {
    const normalized = email.trim().toLowerCase();
    try {
        const emails = readSubscribedEmails();
        if (!emails.some((e) => e.toLowerCase() === normalized)) {
            emails.push(normalized);
            window.localStorage.setItem(SUBSCRIBED_EMAILS_KEY, JSON.stringify(emails));
        }
    } catch {
        // localStorage unavailable (private mode, quota, etc.) — the confirmation still shows
        // for this session, it just won't be remembered on the next visit.
    }
};
