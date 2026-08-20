const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Every backend call (createBaseQuery's fetchBaseQuery, buildImageUrl, useChatHub/usePresenceHub's
// SignalR .withUrl(...)) builds its target as `${API_BASE_URL}/...`. If this is unset — a missing
// .env.development(.local)/.env.production(.local), or one left with unresolved git merge
// conflict markers so VITE_API_BASE_URL never actually got assigned — that template literal
// degrades to a bare relative path ("/api/Account", "/images/foo.jpg", ...), which the browser
// silently resolves against the *frontend's own* origin (e.g. http://localhost:5173/images/foo.jpg)
// instead of the backend. That surfaces as ERR_CONNECTION_REFUSED on every image/API/hub request
// with no indication why — logging loudly here turns a silent, hard-to-trace misconfiguration
// into an obvious one.
if (!API_BASE_URL) {
    console.error(
        "[env] VITE_API_BASE_URL is not set. API, image, and SignalR hub requests will resolve " +
        "as relative URLs against this app's own origin instead of the backend. Set it in " +
        ".env.development.local (or .env.development) — see .env.template."
    );
}

const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
// OAuth 2.0 Client ID from Google Cloud Console (Credentials -> OAuth client ID -> Web application).
// This is a public identifier (not a secret) — safe to ship to the client, same as the reCAPTCHA
// site key below. Falls back to an empty string in dev when unset; GoogleAuthButton hides itself
// rather than rendering a button that would fail at click-time.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
// Falls back to a dummy key in dev when VITE_RECAPTCHA_SITE_KEY isn't set, instead of handing
// GoogleReCaptchaProvider an empty string — an empty reCaptchaKey makes the underlying script
// warn on every page load even though ReCAPTCHA itself is never actually exercised locally.
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6Ld_dummy_dev_key";
// Numeric Telegram bot id (from @BotFather), used by the Telegram Login Widget's custom-button
// JS API (Telegram.Login.auth). Not a secret — same public-identifier status as GOOGLE_CLIENT_ID
// above. TelegramAuthButton hides/disables itself rather than opening a popup that would fail.
const TELEGRAM_BOT_ID = import.meta.env.VITE_TELEGRAM_BOT_ID || "";

const APP_ENV = {
    API_BASE_URL,
    UNSPLASH_ACCESS_KEY,
    GOOGLE_CLIENT_ID,
    RECAPTCHA_SITE_KEY,
    TELEGRAM_BOT_ID,
}

export { APP_ENV }