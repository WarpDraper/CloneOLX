import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForgotPasswordMutation } from '../../../services/accountService.ts';

const ForgotPasswordPage: React.FC = () => {
    const { t } = useTranslation();
    const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!email) {
            setError(t('forgotPassword.errors.emailRequired'));
            return;
        }

        try {
            const response = await forgotPassword({ email }).unwrap();
            setSuccess(response.message || t('forgotPassword.success.default'));
            setEmail('');
        } catch (err: any) {
            setError(err?.data?.message || t('forgotPassword.errors.generic'));
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
                    aria-label={t('forgotPassword.closeAriaLabel')}
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

                {/* Lock icon */}
                <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-full bg-[#6648D2]/10 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-[#6648D2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                </div>

                {/* Heading */}
                <div className="text-center mb-6">
                    <h1 className="text-lg font-bold text-black">{t('forgotPassword.heading')}</h1>
                    <p className="text-[10px] text-[#8F8B8B] mt-1 font-medium">
                        {t('forgotPassword.subheading')}
                    </p>
                </div>

                {/* Success message */}
                {success && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-xs text-center">
                        {success}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-[rgba(62,57,57,0.99)] mb-1">
                            {t('forgotPassword.emailLabel')}
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('forgotPassword.emailPlaceholder')}
                            className="w-full h-11 px-3 text-xs text-[#8F8B8B] border border-black/30 rounded focus:outline-none focus:ring-1 focus:ring-[#6648D2] focus:border-[#6648D2] transition-colors"
                        />
                        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-11 bg-[#6648D2] hover:bg-[#5538c0] text-white text-base font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                    >
                        {isLoading ? t('forgotPassword.sending') : t('forgotPassword.submit')}
                    </button>
                </form>

                {/* Back to login */}
                <p className="text-center text-[10px] text-[#8F8B8B] font-medium mt-6">
                    {t('forgotPassword.rememberedPassword')}{' '}
                    <Link to="/login" className="text-[#6648D2] hover:underline font-medium">
                        {t('forgotPassword.login')}
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;