import React, { useState } from "react";
import { UserOutlined } from "@ant-design/icons";

interface ImageWithFallbackProps {
    src?: string | null;
    alt: string;
    className?: string;
    /** Rendered instead of a broken image when `src` is missing or fails to load (404, an
     *  invalid/truncated base64 data URI, a CORS block, etc.). Defaults to a neutral user icon —
     *  the right shape for `<Avatar>`-style call sites (Header, AccountSidebar, chat). Pass a
     *  custom node for product/advert imagery. */
    fallback?: React.ReactNode;
}

// Reusable avatar-flavoured image with error handling, for the plain <img>/<Avatar> call sites
// across the app that used to render `user.avatarUrl` (or similar) directly. Any load failure —
// a 404'd backend photo, a corrupted/invalid base64 data URI, a blocked request — is caught by
// `onError` and swapped for a static local placeholder icon instead of the browser's broken-image
// glyph. This never throws and never leaves an unhandled promise rejection: `onError` is a
// synchronous DOM event handler, not a promise, and errors are contained to local state.
const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({ src, alt, className, fallback }) => {
    const [failed, setFailed] = useState(false);

    // Reset the failure flag whenever the caller points us at a different src (e.g. the user
    // just uploaded a new photo) so a previous broken image doesn't stick around forever.
    const [srcForState, setSrcForState] = useState(src);
    if (src !== srcForState) {
        setSrcForState(src);
        setFailed(false);
    }

    if (!src || failed) {
        return (
            <div className={`flex items-center justify-center bg-mm-lavender text-mm-purple ${className ?? ""}`}>
                {fallback ?? <UserOutlined />}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={(e) => {
                // Prevent any retry loop / further error bubbling, then fall back to the icon.
                // No re-throw, no console spam, no dangling network activity.
                e.currentTarget.onerror = null;
                setFailed(true);
            }}
        />
    );
};

export default ImageWithFallback;
