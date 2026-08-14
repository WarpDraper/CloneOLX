import React, { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useGoogleLoginMutation } from "../../services/accountService";
import { setAuth } from "../../Slice/authSlice.ts";
import { consumeReturnUrl } from "../../utils/returnUrl.ts";

interface GoogleAuthButtonProps {
    onError?: (message: string) => void;
}

const isGoogleConfigured = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!isGoogleConfigured && import.meta.env.DEV) {
    console.warn("Google Client ID is not configured in .env (VITE_GOOGLE_CLIENT_ID) — Google sign-in is disabled.");
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({ onError }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [googleLogin] = useGoogleLoginMutation();
    const [isExchanging, setIsExchanging] = useState(false);

    const login = useGoogleLogin({
        flow: "implicit",
        onSuccess: async (tokenResponse) => {
            setIsExchanging(true);
            try {
                const authResult = await googleLogin(tokenResponse.access_token).unwrap();
                dispatch(setAuth({ token: authResult.accessToken }));
                navigate(consumeReturnUrl());
            } catch (err: any) {
                onError?.(err?.data?.message || t('googleAuth.errors.loginFailed'));
            } finally {
                setIsExchanging(false);
            }
        },
        onError: () => {
            onError?.(t('googleAuth.errors.popupFailed'));
        },
    });

    const handleClick = () => {
        if (isGoogleConfigured) {
            login();
        } else {
            alert(t('googleAuth.notConfigured'));
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={t('googleAuth.ariaLabel')}
            title={t('googleAuth.ariaLabel')}
            disabled={isExchanging}
            className="w-8 h-8 flex items-center justify-center hover:opacity-70 transition-opacity disabled:opacity-50 disabled:cursor-wait"
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                <path fill="#4CAF50" d="M45 24c0 11.6-9.4 21-21 21S3 35.6 3 24 12.4 3 24 3s21 9.4 21 21z"/>
                <path fill="#FFC107" d="M24 43c-10.5 0-19-8.5-19-19S13.5 5 24 5s19 8.5 19 19-8.5 19-19 19z"/>
                <path fill="#F44336" d="M24 5C13.5 5 5 13.5 5 24h19V5z"/>
                <path fill="#1565C0" d="M5 24c0 10.5 8.5 19 19 19V24H5z"/>
                <circle cx="24" cy="24" r="8" fill="white"/>
                <circle cx="24" cy="24" r="6" fill="#1976D2"/>
            </svg>
        </button>
    );
};

export default GoogleAuthButton;