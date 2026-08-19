import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
    children: ReactNode;
    /** Rendered instead of children once an error has been caught. Defaults to null (render
     * nothing) so a crash in a purely decorative subtree — e.g. the reCAPTCHA widget — never
     * blanks out the rest of the page it's embedded in. */
    fallback?: ReactNode;
    /** Called once when a child throws — use for logging, never for side effects that matter
     * to app state (this only fires for render/commit errors in the subtree below). */
    onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

// Generic React error boundary — there wasn't one anywhere in this app before, which meant any
// uncaught render/commit-phase error in a subtree (e.g. a third-party widget like reCAPTCHA
// throwing while its DOM node is torn down mid-navigation) could crash the entire React root
// instead of being contained to the component that actually failed.
//
// Note: like all React error boundaries, this only catches errors thrown during rendering,
// lifecycle methods, and constructors of the tree below it — NOT errors in event handlers or
// in promises/async callbacks (those need their own try/catch or a window 'unhandledrejection'
// listener; see hooks/useRecaptchaCrashGuard.ts for the reCAPTCHA-specific async case).
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.warn("[ErrorBoundary] Contained a render-tree crash:", error, info.componentStack);
        this.props.onError?.(error, info);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? null;
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
