import React from 'react';
import { useTranslation } from 'react-i18next';
import AdminChatPanel from '../../../components/admin/AdminChatPanel';

const ChatsPage: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold text-[#002f34] m-0">{t('admin.chats.title')}</h1>
            <div className="bg-[#12141c] rounded-2xl p-5">
                <AdminChatPanel />
            </div>
        </div>
    );
};

export default ChatsPage;
