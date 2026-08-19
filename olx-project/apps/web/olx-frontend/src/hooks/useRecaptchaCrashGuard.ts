import { useEffect } from "react";

// react-google-recaptcha-v3 schedules its own internal promises (badge/script handshake,
// periodic token refresh) outside of any call our components make and await directly. If
// GoogleReCaptchaProvider unmounts while one of those is still in flight — e.g. immediately
// after a successful login navigates away from /login — the library's script (recaptcha__*.js)
// can reject with a TypeError while trying to touch a DOM node/ref that's already gone. That
// rejection was never awaited by our code, so no local try/catch can ever catch it: it surfaces
// as "Uncaught (in promise)" in the console and, worse, was observed to disrupt the rest of the
// post-login flow (redirect landing in a state where a stale user id gets queried, 404ing).
//
// This is a page-scoped safety net (mount it from LoginPage/RegisterPage, the only two places
// GoogleReCaptchaProvider exists): swallow only rejections that are clearly reCAPTCHA-originated
// so they can never bubble up as an uncaught error, while leaving every other genuine unhandled
// rejection in the app untouched.
// Google Identity Services' popup-based sign-in (used by GoogleAuthButton on this same page)
// hits the identical class of problem as reCAPTCHA: the browser's Cross-Origin-Opener-Policy
// blocks `window.closed`/`window.close()` checks on the auth popup from the opener's origin,
// which some versions of the SDK surface as an unhandled promise rejection rather than routing
// it through the library's own onError callback. Swallow that alongside reCAPTCHA noise so it
// can never halt JS execution or interrupt the post-login dispatch/navigate that already ran.
//
// A third, unrelated source of the same symptom: third-party browser extensions (password
// managers, ad blockers, etc.) inject content scripts into every page, including /login and
// /register. When one of those scripts registers a `chrome.runtime.onMessage` listener that
// returns `true` (promising an async response) but the extension's own background page never
// actually responds, Chrome rejects with "A listener indicated an asynchronous response by
// returning true, but the message channel closed before a response was received." That
// rejection has nothing to do with this app's code (we don't own the listener), fires on the
// same page as the Google/reCAPTCHA flows, and is otherwise indistinguishable to the user from
// a real auth failure if left to surface as an uncaught console error — swallow it too.
const isRecaptchaError = (reason: unknown): boolean => {
    const message = reason instanceof Error ? `${reason.message} ${reason.stack ?? ""}` : String(reason ?? "");
    return /recaptcha|cross-origin-opener-policy|window\.close|message channel closed|listener indicated an asynchronous response/i.test(message);
};

export function useRecaptchaCrashGuard() {
    useEffect(() => {
        const handleRejection = (event: PromiseRejectionEvent) => {
            if (isRecaptchaError(event.reason)) {
                console.warn("reCAPTCHA background promise failed — ignoring, login/register flow is unaffected.", event.reason);
                event.preventDefault();
            }
        };

        window.addEventListener("unhandledrejection", handleRejection);
        return () => window.removeEventListener("unhandledrejection", handleRejection);
    }, []);
}
