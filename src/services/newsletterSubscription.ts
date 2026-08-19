// DEPRECATED: this local-storage-only stub predated the real backend newsletter endpoint
// (POST /api/account/subscribe, OlxUser.NewsletterSubscribed). ReleaseSubscriptionWidget.tsx now
// uses useNewsletterToggle (hooks/useNewsletterToggle.ts), which persists the subscription to the
// database and stays in sync with SettingsPage instead of writing to localStorage. Left as an
// empty module (not deleted) since no file tooling in this environment can remove files outright.
export {};
