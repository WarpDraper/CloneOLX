import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useTelegramLoginMutation } from "../../services/accountService";
import type { ITelegramAuthData } from "../../types/account/ITelegramAuthData";
import { setAuth } from "../../Slice/authSlice.ts";
import { consumeReturnUrl } from "../../utils/returnUrl.ts";
import { APP_ENV } from "../../env";

interface TelegramAuthButtonProps {
    onError?: (message: string) => void;
}

// Telegram's official "custom login button" JS API (loaded from telegram-widget.js) — lets us
// keep the button's own look (matching GoogleAuthButton) instead of Telegram's stock iframe
// widget. See https://core.telegram.org/widgets/login#22-embedding-a-custom-login-button.
declare global {
    interface Window {
        Telegram?: {
            Login: {
                auth: (
                    options: { bot_id: string; request_access?: boolean },
                    callback: (data: ITelegramAuthData | false) => void
                ) => void;
            };
        };
    }
}

const isTelegramConfigured = !!APP_ENV.TELEGRAM_BOT_ID;

if (!isTelegramConfigured && import.meta.env.DEV) {
    console.warn("Telegram Bot ID is not configured in .env (VITE_TELEGRAM_BOT_ID) — Telegram sign-in is disabled.");
}

const TELEGRAM_WIDGET_SRC = "https://telegram.org/js/telegram-widget.js?22";

function loadTelegramWidgetScript(): Promise<void> {
    if (window.Telegram?.Login) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${TELEGRAM_WIDGET_SRC}"]`);
        if (existing) {
            existing.addEventListener("load", () => resolve());
            existing.addEventListener("error", () => reject(new Error("telegram-widget-load-failed")));
            return;
        }
        const script = document.createElement("script");
        script.src = TELEGRAM_WIDGET_SRC;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("telegram-widget-load-failed"));
        document.body.appendChild(script);
    });
}

export const TelegramAuthButton: React.FC<TelegramAuthButtonProps> = ({ onError }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [telegramLogin] = useTelegramLoginMutation();
    const [isBusy, setIsBusy] = useState(false);

    const handleClick = async () => {
        if (!isTelegramConfigured) {
            alert(t('telegramAuth.notConfigured'));
            return;
        }

        setIsBusy(true);
        try {
            await loadTelegramWidgetScript();
        } catch {
            setIsBusy(false);
            onError?.(t('telegramAuth.errors.widgetFailed'));
            return;
        }

        window.Telegram!.Login.auth(
            { bot_id: APP_ENV.TELEGRAM_BOT_ID, request_access: true },
            async (data) => {
                if (!data) {
                    // User closed the Telegram auth popup without confirming.
                    setIsBusy(false);
                    return;
                }
                try {
                    const authResult = await telegramLogin(data).unwrap();
                    dispatch(setAuth({ token: authResult.accessToken }));
                    navigate(consumeReturnUrl());
                } catch (err: any) {
                    onError?.(err?.data?.message || t('telegramAuth.errors.loginFailed'));
                } finally {
                    setIsBusy(false);
                }
            }
        );
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={t('telegramAuth.ariaLabel')}
            title={t('telegramAuth.ariaLabel')}
            disabled={isBusy}
            className="w-8 h-8 flex items-center justify-center hover:opacity-70 transition-opacity disabled:opacity-50 disabled:cursor-wait"
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="#229ED9">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
            </svg>
        </button>
    );
};

export default TelegramAuthButton;
