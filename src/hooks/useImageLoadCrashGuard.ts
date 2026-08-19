import { useEffect } from "react";

// antd's <Avatar src={...}> does its own internal image-load probe (a bare `new Image()` with
// its own onload/onerror wiring, separate from the `onError` PROP we pass in) to decide whether
// to render the <img> or fall back to `icon`. That internal probe rejects with a plain
// `Error("Unable to load image")` when the src is unusable (a blob: URL revoked mid-flight by a
// fast re-render, a malformed/truncated data: URI, a backend photo URL that 404s before our own
// onError fires) — and because it's antd's own internal promise, no try/catch in OUR code around
// setAvatarPreview/<Avatar> can ever catch it. It surfaces as a bare "Uncaught (in promise)
// Unable to load image" in the console instead.
//
// This mirrors useRecaptchaCrashGuard.ts's approach for the exact same class of problem
// (a third-party widget's internal, unawaited promise rejecting outside our call stack): mount
// page-scoped from any screen that renders an <Avatar>/<img> against a src we don't fully
// control (SettingsPage's avatar preview), and swallow only rejections that are clearly
// image-load-originated so they can never bubble up as an uncaught error, while leaving every
// other genuine unhandled rejection in the app untouched.
const isImageLoadError = (reason: unknown): boolean => {
    const message = reason instanceof Error ? `${reason.message} ${reason.stack ?? ""}` : String(reason ?? "");
    return /unable to load image|failed to load image|error loading image/i.test(message);
};

export function useImageLoadCrashGuard() {
    useEffect(() => {
        const handleRejection = (event: PromiseRejectionEvent) => {
            if (isImageLoadError(event.reason)) {
                console.warn("Avatar/image internal load probe failed — ignoring, a fallback icon/placeholder is already shown.", event.reason);
                event.preventDefault();
            }
        };

        window.addEventListener("unhandledrejection", handleRejection);
        return () => window.removeEventListener("unhandledrejection", handleRejection);
    }, []);
}
