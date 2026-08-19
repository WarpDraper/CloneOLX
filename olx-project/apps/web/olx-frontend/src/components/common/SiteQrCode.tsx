import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { useGetQrCodeUrlQuery } from "../../services/settingsService";

interface SiteQrCodeProps {
    /** Pixel size of the rendered code (square). Defaults to 64 to match the old footer stub. */
    size?: number;
    className?: string;
}

// Static fallback used whenever /api/Settings/qr-code-url is unreachable or 404s (backend not
// yet redeployed with the endpoint, offline dev, transient network failure, etc.) — the QR code
// still renders and still points somewhere useful instead of the UI showing a blank square.
// window.location.origin is preferred (guarded for SSR/non-browser contexts) since it sends
// people to whatever instance of the app they're actually using; https://olx.ua is the last-resort
// static default when window isn't available at all.
const FALLBACK_QR_TARGET_URL =
    typeof window !== "undefined" && window.location?.origin ? window.location.origin : "https://olx.ua";

// Real, auto-generated QR code pointing at the backend-configured QrCodeTargetUrl
// (appsettings.json) — replaces the earlier hand-drawn SVG "QR code" placeholder that never
// encoded anything real. Used in both the footer and the homepage "app coming soon" banner so
// both always point at the same, centrally configurable destination.
const SiteQrCode: React.FC<SiteQrCodeProps> = ({ size = 64, className }) => {
    const { data, isLoading, isError } = useGetQrCodeUrlQuery();

    // Still loading: neutral empty square rather than encoding a blank/undefined string into a
    // misleading code. Once the request settles — success or failure — always render a real QR
    // code: on error (404, network down, backend not yet deployed with this endpoint) fall back
    // to FALLBACK_QR_TARGET_URL instead of leaving the UI with a permanently blank placeholder.
    if (isLoading) {
        return (
            <div
                className={className}
                style={{ width: size, height: size }}
                aria-hidden="true"
            />
        );
    }

    const targetUrl = !isError && data?.url ? data.url : FALLBACK_QR_TARGET_URL;

    return (
        <QRCodeSVG
            value={targetUrl}
            size={size}
            bgColor="#FFFFFF"
            fgColor="#0D0F1A"
            level="M"
            className={className}
        />
    );
};

export default SiteQrCode;
