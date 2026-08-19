import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { useTranslation } from 'react-i18next';
import LoginForm from "../../../components/form/LoginForm.tsx";
import GoogleAuthButton from "../../../components/form/GoogleAuthButton.tsx";
import TelegramAuthButton from "../../../components/form/TelegramAuthButton.tsx";
import { APP_ENV } from "../../../env";
import ErrorBoundary from "../../../components/common/ErrorBoundary.tsx";
import { useRecaptchaCrashGuard } from "../../../hooks/useRecaptchaCrashGuard";

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const [socialError, setSocialError] = useState<string | null>(null);

  // Swallows reCAPTCHA's own background promise rejections (e.g. its internal handshake/refresh
  // failing after this page unmounts on a successful login) so they can never surface as an
  // uncaught error — see the hook for the full story.
  useRecaptchaCrashGuard();

  return (
    // Scoped here (not app-wide) so the reCAPTCHA script is only ever requested on the one
    // page that actually needs it — see main.tsx for why. ErrorBoundary contains any
    // render/commit-phase crash from the widget itself (e.g. while it's being torn down mid
    // navigation) so it can never take the rest of the app down with it.
    <ErrorBoundary>
    <GoogleReCaptchaProvider reCaptchaKey={APP_ENV.RECAPTCHA_SITE_KEY}>
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-[502px] px-10 py-10">

        {/* Close button */}
        <Link
          to="/"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
          aria-label={t('login.closeAriaLabel')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>

        {/* Logo */}
        <div className="text-center mb-2">
          <Link to="/" className="inline-block text-3xl font-bold tracking-tight text-black hover:opacity-80 transition-opacity">
            Multi<span className="text-[#7058D1]">Mart</span>
          </Link>
        </div>

        {/* Heading */}
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold text-black">{t('login.heading')}</h1>
          <p className="text-[10px] text-[#8F8B8B] mt-1 font-medium">
            {t('login.subheading')}
          </p>
        </div>

        {/* Login Form */}
        <LoginForm />

        {/* Divider */}
        <div className="my-4 flex items-center justify-center">
          <span className="text-[10px] text-black font-normal">{t('login.orContinueWith')}</span>
        </div>

        {socialError && (
          <p className="text-red-500 text-xs text-center mb-2">{socialError}</p>
        )}

        {/* Social Icons */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <GoogleAuthButton onError={setSocialError} />
          {/* Twitter/X */}
          <button className="w-8 h-8 flex items-center justify-center hover:opacity-70 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="black">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </button>
          {/* Telegram */}
          <TelegramAuthButton onError={setSocialError} />
          {/* Instagram */}
          <button className="w-8 h-8 flex items-center justify-center hover:opacity-70 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5">
              <defs>
                <radialGradient id="ig-login-grad" cx="30%" cy="107%" r="150%">
                  <stop offset="0%" stopColor="#ffd600"/>
                  <stop offset="50%" stopColor="#ff0069"/>
                  <stop offset="100%" stopColor="#7b2ff7"/>
                </radialGradient>
              </defs>
              <rect width="24" height="24" rx="6" fill="url(#ig-login-grad)"/>
              <circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.5"/>
              <circle cx="17.5" cy="6.5" r="1" fill="white"/>
            </svg>
          </button>
        </div>

        {/* Register link */}
        <p className="text-center text-[10px] text-[#8F8B8B] font-medium">
          {t('login.noAccount')}{' '}
          <Link to="/register" className="text-[#6648D2] hover:underline font-medium">
            {t('login.register')}
          </Link>
        </p>
      </div>
    </div>
    </GoogleReCaptchaProvider>
    </ErrorBoundary>
  );
};

export default LoginPage;
