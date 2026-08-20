import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { useDispatch } from "react-redux";
// 1. Імпортуємо хук для роботи з reCAPTCHA v3
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { useTranslation } from "react-i18next";
import { useLoginMutation } from "../../services/accountService.ts";
import type { IUserLogin } from "../../types/account/IUserLogin.ts";
import { parseServerValidationErrors } from "../../utils/parseServerValidationErrors.ts";
import { setAuth } from "../../Slice/authSlice.ts";
import { Link } from "react-router-dom";
import { consumeReturnUrl } from "../../utils/returnUrl.ts";

const LoginForm: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const [login, { isLoading }] = useLoginMutation();

    // Ініціалізуємо хук капчі всередині компонента
    const { executeRecaptcha } = useGoogleReCaptcha();

    const [formValues, setFormValues] = useState<IUserLogin>({
        email: "",
        password: "",
        recapthcaToken: "",
        action: ""
    });

    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormValues((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setFieldErrors({});

        // Client-side check for missing/invalid fields before ever calling the API — gives
        // immediate, field-level feedback instead of waiting on a round trip that would fail
        // server-side validation anyway.
        const nextFieldErrors: Record<string, string> = {};
        if (!formValues.email.trim()) {
            nextFieldErrors.email = t('login.errors.emailRequired');
        }
        if (!formValues.password) {
            nextFieldErrors.password = t('login.errors.passwordRequired');
        }
        if (Object.keys(nextFieldErrors).length > 0) {
            setFieldErrors(nextFieldErrors);
            return;
        }

        // Перевіряємо, чи скрипт капчі готовий. `executeRecaptcha` flips truthy as soon as
        // GoogleReCaptchaProvider's onLoad fires, but that can land a tick before the actual
        // `grecaptcha` global + its internal ready state are usable — checking window.grecaptcha
        // too catches that gap instead of handing the library a call it can't service yet. (No
        // ambient type ships for `grecaptcha` in this project, hence the cast.)
        const grecaptchaGlobal = typeof window === "undefined" ? undefined : (window as unknown as { grecaptcha?: unknown }).grecaptcha;
        if (!executeRecaptcha || !grecaptchaGlobal) {
            setFormError(t('login.errors.captchaLoading'));
            return;
        }

        // reCAPTCHA v3 has no ref/reset() to guard here (that's react-google-recaptcha's v2 API
        // — this app uses the hook-based, container-less v3 badge), but executeRecaptcha() itself
        // can still reject (script not fully ready, an unmounted/torn-down widget, a transient
        // network failure loading recaptcha__*.js). Isolated in its own try/catch so a captcha
        // hiccup never throws uncaught into handleSubmit and never reaches the login API call
        // below — it fails safe with a plain, actionable error instead of leaving the form stuck.
        let token: string | null = null;
        try {
            token = await executeRecaptcha("login");
        } catch (captchaErr) {
            console.warn("[LoginForm] reCAPTCHA execution bypassed:", captchaErr);
        }
        if (!token) {
            // In production a missing token still blocks submission (real abuse-check gate).
            // In local dev, a flaky/misconfigured reCAPTCHA script must never be able to wedge
            // the login form shut — proceed with an empty token instead of freezing the flow.
            if (import.meta.env.DEV) {
                console.warn("[LoginForm] Proceeding without a reCAPTCHA token (development mode).");
                token = "";
            } else {
                setFormError(t('login.errors.captchaLoading'));
                return;
            }
        }

        try {
            const userData = await login({
                email: formValues.email,
                password: formValues.password,
                recapthcaToken: token,
                action: "login",
            }).unwrap();

            // Auth state must be committed the moment we have a token — nothing below this line
            // (navigation, anything reCAPTCHA-related) may ever gate or delay it, so a follow-up
            // reCAPTCHA teardown issue can never leave the store out of sync with a successful
            // login.
            dispatch(setAuth({
                token: userData.accessToken,
            }));

            // Prefer the explicit `state: { from }` a caller may have passed to /login (e.g.
            // ReleaseSubscriptionWidget's guest gate) over the generic returnUrl sessionStorage
            // flow (cart/favorites gates) — both land the user back where they started, but
            // `state.from` is checked first since it's the more specific, just-set intent.
            const from = (location.state as { from?: string } | null)?.from;
            navigate(from ?? consumeReturnUrl());
        } catch (err: any) {
            if (err?.data?.errors) {
                const { fieldErrors } = parseServerValidationErrors(err.data.errors);
                setFieldErrors(fieldErrors);
            } else {
                setFormError(err?.data?.message || t('login.errors.generic'));
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">

            {/* Email */}
            <div>
                <label className="block text-xs font-medium text-[rgba(62,57,57,0.99)] mb-1">
                    {t('login.emailOrPhone')}
                </label>
                <input
                    name="email"
                    type="email"
                    placeholder={t('login.emailPlaceholder')}
                    value={formValues.email}
                    onChange={handleChange}
                    className="w-full h-11 px-3 text-xs text-[#8F8B8B] border border-black/30 rounded focus:outline-none focus:ring-1 focus:ring-[#6648D2] focus:border-[#6648D2] transition-colors"
                />
                {fieldErrors.email && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
                )}
            </div>

            {/* Password */}
            <div>
                <label className="block text-xs font-medium text-[rgba(62,57,57,0.99)] mb-1">
                    {t('login.password')}
                </label>
                <div className="relative">
                    <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t('login.passwordPlaceholder')}
                        value={formValues.password}
                        onChange={handleChange}
                        className="w-full h-11 px-3 pr-10 text-xs text-[#8F8B8B] border border-black/30 rounded focus:outline-none focus:ring-1 focus:ring-[#6648D2] focus:border-[#6648D2] transition-colors"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                        {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.624-7a9.978 9.978 0 012.228-3.357m3.174-2.2A9.959 9.959 0 0112 5c4.478 0 8.268 2.943 9.624 7a9.978 9.978 0 01-2.228 3.357M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3l18 18M9.88 9.88A3 3 0 0112 9c1.657 0 3 1.343 3 3 0 .513-.123.996-.341 1.42M6.1 6.1A9.956 9.956 0 002 12c1.356 4.057 5.146 7 9.624 7a9.956 9.956 0 005.9-1.9M15.88 15.88A3 3 0 0012 15c-1.657 0-3-1.343-3-3 0-.513.123-.996.341-1.42" />
                            </svg>
                        )}
                    </button>
                </div>
                {fieldErrors.password && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
                )}
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                    <div
                        onClick={() => setRememberMe(prev => !prev)}
                        className={`w-3 h-3 rounded-sm flex items-center justify-center cursor-pointer transition-colors ${rememberMe ? 'bg-[#6648D2]' : 'bg-[#6648D2]'}`}
                    >
                        {rememberMe && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>
                    <span className="text-[10px] text-[#8F8B8B] font-medium">{t('login.rememberMe')}</span>
                </label>
                <Link
                    to="/forgot-password"
                    className="text-[10px] text-[#6648D2] font-medium hover:underline"
                >
                    {t('login.forgotPassword')}
                </Link>
            </div>

            {/* Form error */}
            {formError && (
                <p className="text-red-500 text-xs text-center">{formError}</p>
            )}

            {/* Submit button */}
            <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-[#6648D2] hover:bg-[#5538c0] text-white text-base font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
                {isLoading ? t('common.loading') : t('login.submit')}
            </button>
        </form>
    );
};

export default LoginForm;