import React, { useState } from "react";
import { Modal } from "antd";
import { QRCodeSVG } from "qrcode.react";
import { LinkOutlined, CheckOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

interface QrCodeModalProps {
    open: boolean;
    onClose: () => void;
    /** Defaults to window.location.href — pass an explicit URL (e.g. an advert's canonical
     * link) when the current page isn't the thing being shared. */
    url?: string;
}

// Shareable QR code: renders a high-contrast code pointing at the current page (or an
// explicit `url`), plus a "Copy Link" fallback for devices that can't scan.
const QrCodeModal: React.FC<QrCodeModalProps> = ({ open, onClose, url }) => {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);
    const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard API unavailable (no HTTPS/permissions) — silently no-op, the link is
            // still visible in the modal for a manual copy.
        }
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            centered
            width={360}
            closeIcon={<span className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</span>}
        >
            <div className="flex flex-col items-center text-center px-2 py-4 gap-4">
                <h2 className="text-lg font-bold text-mm-navy">{t('qrModal.title')}</h2>

                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <QRCodeSVG value={shareUrl} size={200} bgColor="#FFFFFF" fgColor="#1A1A2E" level="M" />
                </div>

                <p className="text-xs text-gray-400 break-all px-2">{shareUrl}</p>

                <button
                    type="button"
                    onClick={handleCopy}
                    className="w-full h-11 flex items-center justify-center gap-2 bg-mm-purple hover:bg-mm-purple-dark text-white font-bold rounded-lg transition-colors"
                >
                    {copied ? <CheckOutlined /> : <LinkOutlined />}
                    {copied ? t('qrModal.copied') : t('qrModal.copyLink')}
                </button>
            </div>
        </Modal>
    );
};

export default QrCodeModal;
