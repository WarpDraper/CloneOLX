import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useResetPasswordMutation } from '../../../services/accountService.ts';

const ResetPasswordPage: React.FC = () => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [resetPassword, { isLoading }] = useResetPasswordMutation();

    // The reset email link is built as "...?token=[token]&id=[id]" (see
    // EmailTemplates.GetPasswordResetTemplate) — the backend identifies the user by id, not
    // email, and ResetPasswordModel expects UserId/Token/Password.
    const token = searchParams.get('token');
    const userId = searchParams.get('id');

    const [formValues, setFormValues] = useState({ password: '', confirm: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormValues(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setFieldErrors({});

        if (!token || !userId) {
            setError(t('resetPassword.errors.invalidLink'));
            return;
        }

        if (!formValues.password) {
            setFieldErrors(prev => ({ ...prev, password: t('resetPassword.errors.passwordRequired') }));
            return;
        }

        if (formValues.password.length < 6) {
            setFieldErrors(prev => ({ ...prev, password: t('resetPassword.errors.passwordTooShort') }));
            return;
        }

        if (formValues.password !== formValues.confirm) {
            setFieldErrors(prev => ({ ...prev, confirm: t('resetPassword.errors.passwordMismatch') }));
            return;
        }

        try {
            const response = await resetPassword({
                userId: Number(userId),
                token,
                password: formValues.password,
            }).unwrap();

            setSuccess(response.message || t('resetPassword.success.default'));
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err?.data?.message || t('resetPassword.errors.generic'));
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            {/* Card */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-[502px] px-10 py-10">

                {/* Close button */}
                <Link
                    to="/login"
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
                    aria-label={t('resetPassword.closeAriaLabel')}
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

                {/* Shield icon */}
                <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-full bg-[#6648D2]/10 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-[#6648D2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                </div>

                {/* Heading */}
                <div className="text-center mb-6">
                    <h1 className="text-lg font-bold text-black">{t('resetPassword.heading')}</h1>
                    <p className="text-[10px] text-[#8F8B8B] mt-1 font-medium">
                        {t('resetPassword.subheading')}
                    </p>
                </div>

                {/* Success message */}
                {success && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-xs text-center">
                        {success} {t('resetPassword.successRedirecting')}
                    </div>
                )}

                {/* Invalid link */}
                {(!token || !userId) && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs text-center">
                        {t('resetPassword.invalidLink')}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-3">

                    {/* New password */}
                    <div>
                        <label className="block text-xs font-medium text-[rgba(62,57,57,0.99)] mb-1">
                            {t('resetPassword.newPasswordLabel')}
                        </label>
                        <div className="relative">
                            <input
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder={t('resetPassword.newPasswordPlaceholder')}
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
                        {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
                    </div>

                    {/* Confirm password */}
                    <div>
                        <label className="block text-xs font-medium text-[rgba(62,57,57,0.99)] mb-1">
                            {t('resetPassword.confirmPasswordLabel')}
                        </label>
                        <div className="relative">
                            <input
                                name="confirm"
                                type={showConfirm ? 'text' : 'password'}
                                placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                                value={formValues.confirm}
                                onChange={handleChange}
                                className="w-full h-11 px-3 pr-10 text-xs text-[#8F8B8B] border border-black/30 rounded focus:outline-none focus:ring-1 focus:ring-[#6648D2] focus:border-[#6648D2] transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(prev => !prev)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                            >
                                {showConfirm ? (
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
                        {fieldErrors.confirm && <p className="text-red-500 text-xs mt-1">{fieldErrors.confirm}</p>}
                    </div>

                    {/* Form error */}
                    {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isLoading || !token || !userId}
                        className="w-full h-11 bg-[#6648D2] hover:bg-[#5538c0] text-white text-base font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                    >
                        {isLoading ? t('common.saving') : t('resetPassword.submit')}
                    </button>
                </form>

                {/* Back to login */}
                <p className="text-center text-[10px] text-[#8F8B8B] font-medium mt-6">
                    {t('resetPassword.backTo')}{' '}
                    <Link to="/login" className="text-[#6648D2] hover:underline font-medium">
                        {t('resetPassword.login')}
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default ResetPasswordPage;