import React, { useState } from 'react';
import { Input, Button, Popconfirm, message, Statistic } from 'antd';
import { MailOutlined, TeamOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
    useGetNewsletterSubscribersCountQuery,
    useSendNewsletterMutation,
} from '../../../services/adminService';

// Admin > "Розсилка" (Newsletter) — composes and broadcasts an email to every OlxUser with
// NewsletterSubscribed == true (see AdminController.SendNewsletter / IAccountService.
// SendNewsletterAsync). Replaces the previous ComingSoonPage stub with real send logic.
const NewsletterPage: React.FC = () => {
    const { t } = useTranslation();
    const { data: subscriberStats } = useGetNewsletterSubscribersCountQuery();
    const [sendNewsletter, { isLoading }] = useSendNewsletterMutation();

    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    const subscribersCount = subscriberStats?.count ?? 0;
    const canSend = subject.trim().length > 0 && body.trim().length > 0 && subscribersCount > 0;

    const handleSend = async () => {
        try {
            const result = await sendNewsletter({ subject: subject.trim(), body: body.trim() }).unwrap();
            message.success(t('admin.newsletter.sendSuccess', { count: result.sentCount }));
            setSubject('');
            setBody('');
        } catch {
            message.error(t('admin.newsletter.sendError'));
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-[#002f34] m-0">{t('admin.newsletter.title')}</h1>
                <Statistic
                    title={t('admin.newsletter.subscribersLabel')}
                    value={subscribersCount}
                    prefix={<TeamOutlined />}
                />
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm flex flex-col gap-4 max-w-2xl">
                <div>
                    <p className="text-sm font-medium text-mm-navy mb-2">{t('admin.newsletter.subjectLabel')}</p>
                    <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder={t('admin.newsletter.subjectPlaceholder')}
                        maxLength={200}
                    />
                </div>

                <div>
                    <p className="text-sm font-medium text-mm-navy mb-2">{t('admin.newsletter.bodyLabel')}</p>
                    <Input.TextArea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder={t('admin.newsletter.bodyPlaceholder')}
                        rows={8}
                        maxLength={20000}
                    />
                </div>

                {subscribersCount === 0 && (
                    <p className="text-xs text-gray-400">{t('admin.newsletter.noSubscribers')}</p>
                )}

                <Popconfirm
                    title={t('admin.newsletter.confirmTitle')}
                    description={t('admin.newsletter.confirmDescription', { count: subscribersCount })}
                    onConfirm={handleSend}
                    okText={t('admin.common.yes')}
                    cancelText={t('admin.common.no')}
                    disabled={!canSend}
                >
                    <Button
                        type="primary"
                        icon={<MailOutlined />}
                        disabled={!canSend}
                        loading={isLoading}
                        className="self-start bg-mm-purple hover:!bg-mm-purple-dark"
                    >
                        {t('admin.newsletter.sendButton')}
                    </Button>
                </Popconfirm>
            </div>
        </div>
    );
};

export default NewsletterPage;
