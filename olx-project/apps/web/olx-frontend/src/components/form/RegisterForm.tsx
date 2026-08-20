import { useState } from "react";
import { useNavigate } from "react-router";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { useRegisterMutation } from "../../services/accountService.ts";
import type { IRegisterUser } from "../../types/account/IRegisterUser.ts";

import ImageUploader from "../uploaders/ImageUploader.tsx";
import type { UploadFile } from "antd";
import { parseServerValidationErrors } from "../../utils/parseServerValidationErrors.ts";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { setAuth } from "../../Slice/authSlice.ts";
import PhoneInput from "../inputs/PhoneInput.tsx";
import { extractSubscriberDigits, ukrainianPhoneErrorMessage } from "../../utils/phone.ts";
import WelcomeModal from "../common/WelcomeModal.tsx";

const RegisterForm: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [register, { isLoading }] = useRegisterMutation();
    const [showWelcome, setShowWelcome] = useState(false);

    // Ініціалізуємо хук капчі
    const { executeRecaptcha } = useGoogleReCaptcha();

    const [formValues, setFormValues] = useState<IRegisterUser>({
        Email: "",
        Password: "",
        PasswordConfirmation: "",
        FirstName: "",
        LastName: "",
        ImageFile: null,
        WebSite: "",
        About: "",
        PhoneNumber: "",
        SettlementRef: "",
        RecapthcaToken: "",
        Action: "",
        TermsAccepted: false,
    });

    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [imageError, setImageError] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormValues((prev) => ({ ...prev, [name]: value }));
    };

    const handlePhoneChange = (backendFormattedValue: string) => {
        setFormValues((prev) => ({ ...prev, PhoneNumber: backendFormattedValue }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setFieldErrors({});

        // Client-side check for missing required fields before hitting the API — surfaces all
        // of them at once instead of one round trip per mistake.
        const nextFieldErrors: Record<string, string> = {};
        if (!formValues.FirstName.trim()) nextFieldErrors.FirstName = t('register.errors.firstNameRequired');
        if (!formValues.LastName.trim()) nextFieldErrors.LastName = t('register.errors.lastNameRequired');
        if (!formValues.Email.trim()) nextFieldErrors.Email = t('register.errors.emailRequired');
        if (!formValues.PhoneNumber.trim()) {
            nextFieldErrors.PhoneNumber = t('register.errors.phoneRequired');
        } else {
            const phoneError = ukrainianPhoneErrorMessage(extractSubscriberDigits(formValues.PhoneNumber));
            if (phoneError) nextFieldErrors.PhoneNumber = phoneError;
        }
        if (!formValues.Password) nextFieldErrors.Password = t('register.errors.passwordRequired');
        if (!formValues.PasswordConfirmation) nextFieldErrors.PasswordConfirmation = t('register.errors.passwordConfirmationRequired');
        if (!formValues.TermsAccepted) nextFieldErrors.TermsAccepted = t('register.errors.termsRequired');
        if (Object.keys(nextFieldErrors).length > 0) {
            setFieldErrors(nextFieldErrors);
            return;
        }

        // Перевіряємо збіг паролів
        if (formValues.Password !== formValues.PasswordConfirmation) {
            setFieldErrors((prev) => ({
                ...prev,
                PasswordConfirmation: t('register.errors.passwordMismatch'),
            }));
            return;
        }

        // `executeRecaptcha` flips truthy as soon as GoogleReCaptchaProvider's onLoad fires,
        // which can land a tick before the actual `grecaptcha` global + its internal ready state
        // are usable — checking window.grecaptcha too catches that gap instead of handing the
        // library a call it can't service yet. (No ambient type ships for `grecaptcha` in this
        // project, hence the cast.)
        const grecaptchaGlobal = typeof window === "undefined" ? undefined : (window as unknown as { grecaptcha?: unknown }).grecaptcha;
        if (!executeRecaptcha || !grecaptchaGlobal) {
            setFormError(t('register.errors.captchaLoading'));
            return;
        }

        // Isolated from the registration try/catch below: executeRecaptcha() can reject on its
        // own (script not ready, torn-down widget, transient network failure) and must never
        // throw uncaught into handleSubmit or block the rest of a form the user already filled
        // out — fail safe with a plain error instead of a crash.
        let token: string | null = null;
        try {
            token = await executeRecaptcha("register");
        } catch (captchaErr) {
            console.warn("[RegisterForm] reCAPTCHA execution bypassed:", captchaErr);
        }
        if (!token) {
            // Same dev-mode escape hatch as LoginForm: production still requires a real token,
            // but a flaky/misconfigured reCAPTCHA script must never be able to wedge the
            // registration form shut locally.
            if (import.meta.env.DEV) {
                console.warn("[RegisterForm] Proceeding without a reCAPTCHA token (development mode).");
                token = "";
            } else {
                setFormError(t('register.errors.captchaLoading'));
                return;
            }
        }

        try {
            const formData = new FormData();

            // Передаємо дані відповідно до назв у Swagger
            formData.append("Email", formValues.Email);
            formData.append("Password", formValues.Password);
            formData.append("PasswordConfirmation", formValues.PasswordConfirmation);
            formData.append("FirstName", formValues.FirstName);
            formData.append("LastName", formValues.LastName);
            formData.append("PhoneNumber", formValues.PhoneNumber);
            formData.append("WebSite", formValues.WebSite || "");
            formData.append("About", formValues.About || "");
            formData.append("SettlementRef", formValues.SettlementRef || "");
            formData.append("RecapthcaToken", token);
            formData.append("Action", "register");
            formData.append("TermsAccepted", String(formValues.TermsAccepted));

            // Додаємо фото тільки якщо користувач його дійсно вибрав
            if (fileList[0]?.originFileObj) {
                formData.append("ImageFile", fileList[0].originFileObj as File);
            }

            // Надсилаємо PUT запит на реєстрацію. Бекенд одразу повертає accessToken (як і
            // /login), тому користувача можна автентифікувати без окремого виклику логіну —
            // саме це усуває миттєвий "logout" одразу після реєстрації.
            const userData = await register(formData as any).unwrap();

            dispatch(setAuth({ token: userData.accessToken }));

            setShowWelcome(true);
        } catch (err: any) {
            if (err?.data?.errors) {
                const { fieldErrors } = parseServerValidationErrors(err.data.errors);
                setFieldErrors(fieldErrors);
            } else {
                setFormError(err?.data?.message || t('register.errors.generic'));
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">

            {/* First Name & Last Name */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-[rgba(62,57,57,0.99)] mb-1">
                        {t('register.firstName')}
                    </label>
                    <input
                        name="FirstName"
                        type="text"
                        placeholder={t('register.firstNamePlaceholder')}
                        value={formValues.FirstName}
                        onChange={handleChange}
                        className="w-full h-11 px-3 text-xs text-[#8F8B8B] border border-black/30 rounded focus:outline-none focus:ring-1 focus:ring-[#6648D2] focus:border-[#6648D2] transition-colors"
                    />
                    {(fieldErrors.FirstName || fieldErrors.firstName) && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.FirstName || fieldErrors.firstName}</p>
                    )}
                </div>
                <div>
                    <label className="block text-xs font-medium text-[rgba(62,57,57,0.99)] mb-1">
                        {t('register.lastName')}
                    </label>
                    <input
                        name="LastName"
                        type="text"
                        placeholder={t('register.lastNamePlaceholder')}
                        value={formValues.LastName}
                        onChange={handleChange}
                        className="w-full h-11 px-3 text-xs text-[#8F8B8B] border border-black/30 rounded focus:outline-none focus:ring-1 focus:ring-[#6648D2] focus:border-[#6648D2] transition-colors"
                    />
                    {(fieldErrors.LastName || fieldErrors.lastName) && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.LastName || fieldErrors.lastName}</p>
                    )}
                </div>
            </div>

            {/* Email */}
            <div>
                <label className="block text-xs font-medium text-[rgba(62,57,57,0.99)] mb-1">
                    {t('register.emailOrPhone')}
                </label>
                <input
                    name="Email"
                    type="email"
                    placeholder={t('register.emailPlaceholder')}
                    value={formValues.Email}
                    onChange={handleChange}
                    className="w-full h-11 px-3 text-xs text-[#8F8B8B] border border-black/30 rounded focus:outline-none focus:ring-1 focus:ring-[#6648D2] focus:border-[#6648D2] transition-colors"
                />
                {(fieldErrors.Email || fieldErrors.email) && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.Email || fieldErrors.email}</p>
                )}
            </div>

            {/* Phone Number */}
            <div>
                <label className="block text-xs font-medium text-[rgba(62,57,57,0.99)] mb-1">
                    {t('register.phoneNumber')}
                </label>
                <PhoneInput
                    name="PhoneNumber"
                    value={formValues.PhoneNumber}
                    onChange={handlePhoneChange}
                    className="w-full h-11 px-3 text-xs text-[#8F8B8B] border border-black/30 rounded focus:outline-none focus:ring-1 focus:ring-[#6648D2] focus:border-[#6648D2] transition-colors"
                />
                {(fieldErrors.PhoneNumber || fieldErrors.phoneNumber) && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.PhoneNumber || fieldErrors.phoneNumber}</p>
                )}
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-[rgba(62,57,57,0.99)] mb-1">
                        {t('register.password')}
                    </label>
                    <PasswordInput
                        name="Password"
                        placeholder={t('register.passwordPlaceholder')}
                        value={formValues.Password}
                        onChange={handleChange}
                    />
                    {(fieldErrors.Password || fieldErrors.password) && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.Password || fieldErrors.password}</p>
                    )}
                </div>
                <div>
                    <label className="block text-xs font-medium text-[rgba(62,57,57,0.99)] mb-1">
                        {t('register.passwordConfirmation')}
                    </label>
                    <PasswordInput
                        name="PasswordConfirmation"
                        placeholder={t('register.passwordConfirmationPlaceholder')}
                        value={formValues.PasswordConfirmation}
                        onChange={handleChange}
                    />
                    {(fieldErrors.PasswordConfirmation || fieldErrors.passwordConfirmation || fieldErrors.passwordConfirm) && (
                        <p className="text-red-500 text-xs mt-1">
                            {fieldErrors.PasswordConfirmation || fieldErrors.passwordConfirmation || fieldErrors.passwordConfirm}
                        </p>
                    )}
                </div>
            </div>

            {/* Photo upload */}
            <div className="w-full text-center">
                <ImageUploader
                    fileList={fileList}
                    setFileList={setFileList}
                    imageError={imageError}
                    setImageError={setImageError}
                />
                {imageError && <p className="text-red-500 text-xs mt-1">{t('register.imageRequired')}</p>}
            </div>

            {/* Terms of Service agreement */}
            <div className="flex flex-col gap-1">
                <label className="flex items-start gap-2 text-xs text-[rgba(62,57,57,0.99)] cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formValues.TermsAccepted}
                        onChange={(e) => {
                            setFormValues((prev) => ({ ...prev, TermsAccepted: e.target.checked }));
                            if (e.target.checked) {
                                setFieldErrors((prev) => {
                                    if (!prev.TermsAccepted) return prev;
                                    const next = { ...prev };
                                    delete next.TermsAccepted;
                                    return next;
                                });
                            }
                        }}
                        className="mt-0.5 shrink-0"
                    />
                    <span>
                        {t('register.termsPrefix')}{' '}
                        <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-[#6648D2] font-medium hover:underline">
                            {t('register.termsLink')}
                        </Link>
                    </span>
                </label>
                {fieldErrors.TermsAccepted && (
                    <p className="text-red-500 text-xs">{fieldErrors.TermsAccepted}</p>
                )}
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
                {isLoading ? t('common.loading') : t('register.submit')}
            </button>

            <WelcomeModal
                open={showWelcome}
                onClose={() => navigate("/")}
                onShop={() => navigate("/")}
                onGoToProfile={() => navigate("/profile")}
            />
        </form>
    );
};

/* ─── Password field with show/hide toggle ─── */
interface PasswordInputProps {
    name: string;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PasswordInput: React.FC<PasswordInputProps> = ({ name, placeholder, value, onChange }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input
                name={name}
                type={show ? "text" : "password"}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className="w-full h-11 px-3 pr-10 text-xs text-[#8F8B8B] border border-black/30 rounded focus:outline-none focus:ring-1 focus:ring-[#6648D2] focus:border-[#6648D2] transition-colors"
            />
            <button
                type="button"
                onClick={() => setShow(prev => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
                {show ? (
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
    );
};

export default RegisterForm;