import React from "react";
import { Modal } from "antd";
import { useTranslation } from "react-i18next";

interface WelcomeModalProps {
    open: boolean;
    /** Close (X) — closes and redirects home. */
    onClose: () => void;
    /** "Перейти до покупок" — purple primary button, routes home/catalog. */
    onShop: () => void;
    /** "Перейти в особистий кабінет" — secondary text link, routes to profile. */
    onGoToProfile: () => void;
}

// Post-registration welcome screen (Frame per screenshot): shown immediately after a
// successful signup. Purely presentational — RegisterForm owns the open/close state and
// navigation targets.
const WelcomeModal: React.FC<WelcomeModalProps> = ({ open, onClose, onShop, onGoToProfile }) => {
    const { t } = useTranslation();
    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            centered
            width={420}
            closeIcon={
                <span className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</span>
            }
        >
            <div className="flex flex-col items-center text-center px-2 py-4">
                {/* Happy sun illustration */}
                <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4">
                    <circle cx="48" cy="48" r="22" fill="#FFB800" />
                    <g stroke="#FFB800" strokeWidth="4" strokeLinecap="round">
                        <line x1="48" y1="6" x2="48" y2="16" />
                        <line x1="48" y1="80" x2="48" y2="90" />
                        <line x1="6" y1="48" x2="16" y2="48" />
                        <line x1="80" y1="48" x2="90" y2="48" />
                        <line x1="16.5" y1="16.5" x2="23.5" y2="23.5" />
                        <line x1="72.5" y1="72.5" x2="79.5" y2="79.5" />
                        <line x1="79.5" y1="16.5" x2="72.5" y2="23.5" />
                        <line x1="23.5" y1="72.5" x2="16.5" y2="79.5" />
                    </g>
                    {/* Happy face */}
                    <circle cx="40" cy="45" r="2.5" fill="#5C3D00" />
                    <circle cx="56" cy="45" r="2.5" fill="#5C3D00" />
                    <path d="M38 55c3 4 17 4 20 0" stroke="#5C3D00" strokeWidth="3" strokeLinecap="round" fill="none" />
                </svg>

                <h2 className="text-2xl font-bold text-mm-navy">{t('welcomeModal.title')}</h2>
                <p className="text-base font-semibold text-mm-navy mt-1">{t('welcomeModal.subtitle')}</p>
                <p className="text-sm text-gray-500 mt-2">{t('welcomeModal.thanks')}</p>

                <button
                    type="button"
                    onClick={onShop}
                    className="w-full mt-6 h-12 bg-mm-purple hover:bg-mm-purple-dark text-white font-bold rounded-lg transition-colors"
                >
                    {t('welcomeModal.shopButton')}
                </button>

                <button
                    type="button"
                    onClick={onGoToProfile}
                    className="mt-4 text-sm text-mm-purple font-medium hover:underline"
                >
                    {t('welcomeModal.profileLink')}
                </button>
            </div>
        </Modal>
    );
};

export default WelcomeModal;
