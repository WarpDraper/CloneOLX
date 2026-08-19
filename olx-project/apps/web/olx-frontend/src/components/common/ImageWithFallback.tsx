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

// Base classes every avatar-flavoured render must keep, regardless of what a call site passes
// in `className`. `object-cover` + `object-center` are load-bearing: without them a non-square
// source photo would squash/distort (plain object-fill) or letterbox (object-contain) instead of
// cropping tightly to fill its frame. Appended after the caller's className so they win any
// Tailwind class-order conflict, which is what stops a stray `object-contain` from a call site
// silently downgrading every avatar back to letterboxing.
//
// IMPORTANT: this intentionally does NOT include `w-full h-full` or `aspect-square` — forcing
// those unconditionally previously caused a full-page avatar blowup (Header.tsx renders this
// component with no sized wrapper div around it, only a `w-10 h-10` on the className itself), so
// `w-full h-full` won permutation-wise and expanded the image to its nearest *sized* ancestor
// (in Header's flex layout, effectively the whole nav bar / viewport width). Sizing is now 100%
// the caller's responsibility via an explicitly bounded wrapper — see call sites below — so this
// component only ever fills whatever box it's actually given, never forces one into existence.
const AVATAR_BASE_CLASSES = "object-cover object-center overflow-hidden scale-110";

// Reusable avatar-flavoured image with error handling, for the plain <img>/<Avatar> call sites
// across the app that used to render `user.avatarUrl` (or similar) directly. Any load failure —
// a 404'd backend photo, a corrupted/invalid base64 data URI, a blocked request — is caught by
// `onError` and swapped for a static local placeholder icon instead of the browser's broken-image
// glyph. This never throws and never leaves an unhandled promise rejection: `onError` is a
// synchronous DOM event handler, not a promise, and errors are contained to local state.
//
// Callers MUST size this themselves — either via an explicitly sized wrapper div
// (`w-12 h-12 aspect-square rounded-full overflow-hidden shrink-0`) with `w-full h-full` passed
// in className, or by passing fixed dimensions directly in className (e.g. `w-10 h-10`). This
// component will not inject a size on your behalf.
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
            <div className={`flex items-center justify-center bg-mm-lavender text-mm-purple ${className ?? ""} ${AVATAR_BASE_CLASSES}`}>
                {fallback ?? <UserOutlined />}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={`bg-gray-100 ${className ?? ""} ${AVATAR_BASE_CLASSES}`}
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
