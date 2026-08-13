import React, { useEffect, useState } from 'react';
import { Modal, Radio, message } from 'antd';
import { UserOutlined, ShopOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useEditUserMutation } from '../../../services/accountService';
import { setAuth } from '../../../Slice/authSlice';
import type { ISellerProfile } from '../../../types/user/ISellerProfile';

interface AccountTypeModalProps {
    open: boolean;
    onClose: () => void;
    userId: number;
    profile?: ISellerProfile;
}

// POST /api/account/edit/user, multipart/form-data — same endpoint/shape as SettingsPage.
// AutoMapper's mapper.Map(userEditModel, user) overwrites every mapped field even with a null
// source, so every field currently on the profile must be resent unchanged alongside the new
// AccountType or they'd get wiped (see UserEditModel.AccountType doc comment).
const AccountTypeModal: React.FC<AccountTypeModalProps> = ({ open, onClose, userId, profile }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [editUser, { isLoading }] = useEditUserMutation();
    const [selected, setSelected] = useState<'Individual' | 'Business'>(profile?.accountType ?? 'Individual');

    useEffect(() => {
        if (open) setSelected(profile?.accountType ?? 'Individual');
    }, [open, profile?.accountType]);

    const handleConfirm = async () => {
        const formData = new FormData();
        formData.append('Id', String(userId));
        formData.append('FirstName', profile?.firstName ?? '');
        formData.append('LastName', profile?.lastName ?? '');
        formData.append('PhoneNumber', profile?.phoneNumber ?? '');
        formData.append('SettlementRef', profile?.settlementRef ?? '');
        formData.append('About', profile?.about ?? '');
        formData.append('WebSite', profile?.webSite ?? '');
        formData.append('AccountType', selected);
        // No new photo — sentinel so EditUserAsync keeps the existing one instead of wiping it.
        formData.append('ImageFile', new File([''], 'existing', { type: 'image/existing' }));

        try {
            const response = await editUser(formData).unwrap();
            dispatch(setAuth({ token: response.accessToken }));
            message.success(t('userProfile.accountTypeModal.saveSuccess'));
            onClose();
        } catch (err: any) {
            message.error(err?.data?.message || t('userProfile.accountTypeModal.saveError'));
        }
    };

    return (
        <Modal
            title={t('userProfile.accountType.heading')}
            open={open}
            onCancel={onClose}
            onOk={handleConfirm}
            okText={t('userProfile.accountTypeModal.okText')}
            cancelText={t('common.cancel')}
            confirmLoading={isLoading}
            okButtonProps={{ disabled: !profile }}
        >
            <p className="text-sm text-gray-600 mb-4">
                {t('userProfile.accountType.description')}
            </p>
            {!profile && <p className="text-xs text-gray-400 mb-4">{t('userProfile.accountTypeModal.loadingProfile')}</p>}
            <Radio.Group
                onChange={(e) => setSelected(e.target.value)}
                value={selected}
                className="flex flex-col gap-3 w-full"
            >
                <Radio value="Individual" className="border border-gray-200 rounded-lg px-4 py-3 w-full">
                    <span className="flex items-center gap-2 font-medium text-mm-navy"><UserOutlined /> {t('userProfile.accountTypeLabels.individual')}</span>
                </Radio>
                <Radio value="Business" className="border border-gray-200 rounded-lg px-4 py-3 w-full">
                    <span className="flex items-center gap-2 font-medium text-mm-navy"><ShopOutlined /> {t('userProfile.accountTypeLabels.business')}</span>
                </Radio>
            </Radio.Group>
        </Modal>
    );
};

export default AccountTypeModal;
