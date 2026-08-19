import React, { useState } from 'react';
import { Modal, Radio, InputNumber, message, Steps } from 'antd';
import { CreditCardOutlined, CheckCircleFilled } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useTopUpWalletMutation } from '../../../services/accountService';

interface WalletTopUpModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: (amount: number) => void;
}

const PRESET_AMOUNTS = [100, 250, 500, 1000];

// Payment method selection is still a mock (no real gateway integration — only "bank card" is
// offered and it's not actually charged), but the top-up itself now hits the real backend
// (POST /api/account/wallet/topup) and persists to the DB-backed Balance column, invalidating
// the "MyProfile" RTK Query tag so the header/profile balance refetches automatically.
const WalletTopUpModal: React.FC<WalletTopUpModalProps> = ({ open, onClose, onSuccess }) => {
    const { t } = useTranslation();
    const [amount, setAmount] = useState<number>(PRESET_AMOUNTS[1]);
    const [step, setStep] = useState<'amount' | 'processing' | 'done'>('amount');
    const [topUpWallet] = useTopUpWalletMutation();

    const reset = () => {
        setStep('amount');
        setAmount(PRESET_AMOUNTS[1]);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handlePay = async () => {
        if (!amount || amount <= 0) {
            message.error(t('userProfile.walletTopUp.amountRequired'));
            return;
        }
        setStep('processing');
        try {
            await topUpWallet(amount).unwrap();
            setStep('done');
            onSuccess?.(amount);
        } catch {
            message.error(t('userProfile.walletTopUp.topUpFailed'));
            setStep('amount');
        }
    };

    return (
        <Modal
            title={t('userProfile.topUpButton')}
            open={open}
            onCancel={handleClose}
            footer={null}
            afterClose={reset}
        >
            <Steps
                size="small"
                current={step === 'amount' ? 0 : step === 'processing' ? 1 : 2}
                items={[{ title: t('userProfile.walletTopUp.stepAmount') }, { title: t('userProfile.walletTopUp.stepPayment') }, { title: t('userProfile.walletTopUp.stepDone') }]}
                className="mb-6"
            />

            {step === 'amount' && (
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-4 gap-2">
                        {PRESET_AMOUNTS.map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => setAmount(preset)}
                                className={`rounded-lg border px-2 py-2 text-sm font-semibold transition-colors ${
                                    amount === preset
                                        ? 'border-mm-purple bg-mm-lavender text-mm-purple'
                                        : 'border-gray-200 text-mm-navy hover:border-mm-purple'
                                }`}
                            >
                                {t('userProfile.walletTopUp.presetAmount', { amount: preset })}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-mm-navy">{t('userProfile.walletTopUp.customAmountLabel')}</label>
                        <InputNumber
                            min={1}
                            max={100000}
                            value={amount}
                            onChange={(v) => setAmount(v ?? 0)}
                            className="w-full"
                        />
                    </div>
                    <Radio.Group defaultValue="card" className="flex flex-col gap-2">
                        <Radio value="card" className="border border-gray-200 rounded-lg px-3 py-2">
                            <span className="flex items-center gap-2 text-sm font-medium text-mm-navy">
                                <CreditCardOutlined /> {t('userProfile.walletTopUp.bankCard')}
                            </span>
                        </Radio>
                    </Radio.Group>
                    <button
                        type="button"
                        onClick={handlePay}
                        className="bg-mm-purple hover:bg-mm-purple-dark text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-colors"
                    >
                        {t('userProfile.walletTopUp.payButton', { amount: amount || 0 })}
                    </button>
                </div>
            )}

            {step === 'processing' && (
                <div className="flex flex-col items-center gap-3 py-8 text-gray-500">
                    <CreditCardOutlined className="text-3xl animate-pulse" />
                    <p className="text-sm">{t('userProfile.walletTopUp.processing')}</p>
                </div>
            )}

            {step === 'done' && (
                <div className="flex flex-col items-center gap-3 py-8">
                    <CheckCircleFilled className="text-4xl text-green-500" />
                    <p className="text-sm font-semibold text-mm-navy">{t('userProfile.walletTopUp.successMessage', { amount })}</p>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="mt-2 bg-mm-navy text-white font-bold text-sm px-6 py-2 rounded-lg"
                    >
                        {t('userProfile.walletTopUp.stepDone')}
                    </button>
                </div>
            )}
        </Modal>
    );
};

export default WalletTopUpModal;
