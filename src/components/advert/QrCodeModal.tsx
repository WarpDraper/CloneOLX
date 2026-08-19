import React, { useEffect } from "react";
import { CloseOutlined } from "@ant-design/icons";
import { QRCode } from "antd";
import { useTranslation } from "react-i18next";

interface QrCodeModalProps {
    open: boolean;
    onClose: () => void;
    // Defaults to the current page URL — callers only need to pass this if they want to share
    // something other than the page the modal was opened from (e.g. a canonical advert URL).
    value?: string;
}

// Fullscreen "scan to view on your phone" overlay. Deliberately a plain fixed/backdrop div
// rather than antd's <Modal> (used elsewhere, e.g. ReportModal): the design calls for a
// specific dim+blur backdrop and zoom-in entrance that antd's Modal doesn't expose control over.
const QrCodeModal: React.FC<QrCodeModalProps> = ({ open, onClose, value }) => {
    const { t } = useTranslation();
    const qrValue = value ?? (typeof window !== "undefined" ? window.location.href : "");

    // Escape-to-close + body scroll lock while the overlay is up. Effect no-ops (and cleans up)
    // as soon as `open` goes false, so nothing leaks if the modal is unmounted instead of closed.
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKeyDown);

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={t("advertDetails.qr.title")}
                // Stop propagation so clicks inside the card don't bubble to the backdrop's
                // onClick and immediately close the modal they were just interacting with.
                onClick={(e) => e.stopPropagation()}
                className="qr-modal-in relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full"
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={t("advertDetails.qr.closeAriaLabel")}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-mm-navy hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                    <CloseOutlined />
                </button>

                <div className="text-center pr-6">
                    <h3 className="text-base font-bold text-mm-navy dark:text-white">{t("advertDetails.qr.title")}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("advertDetails.qr.hint")}</p>
                </div>

                {/* White padded wrapper regardless of light/dark theme — QR scanners need real
                    contrast, and antd's QRCode renders dark modules on a transparent/light
                    background, which would be unreadable directly on the dark-mode card. */}
                <div className="p-3 bg-white rounded-xl shadow-inner">
                    <QRCode value={qrValue || " "} size={220} bordered={false} />
                </div>
            </div>
        </div>
    );
};

export default QrCodeModal;
