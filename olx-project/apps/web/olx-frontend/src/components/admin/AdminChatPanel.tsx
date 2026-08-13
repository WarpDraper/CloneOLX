import React, { useMemo, useState } from 'react';
import { Input, Button, Empty, Spin, message as antMessage } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
    useGetAdminMessagesQuery,
    useSendMessageToUserMutation,
    useSetMessageReadMutation,
    type IAdminMessageItem,
} from '../../services/adminMessageService';

const formatTime = (value: string) => new Date(value).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

interface Thread {
    userId: number;
    userName: string;
    messages: IAdminMessageItem[];
    unreadCount: number;
    lastMessage: IAdminMessageItem;
}

// Real messaging interface built on top of the existing AdminMessage system (users -> admin).
// There's no dedicated "chat" backend in this project — this reuses genuine data instead of
// mocking up a UI with fabricated conversations.
const AdminChatPanel: React.FC = () => {
    const { t } = useTranslation();
    const { data: messages = [], isLoading } = useGetAdminMessagesQuery();
    const [sendMessage, { isLoading: isSending }] = useSendMessageToUserMutation();
    const [setRead] = useSetMessageReadMutation();

    const threads = useMemo<Thread[]>(() => {
        const byUser = new Map<number, IAdminMessageItem[]>();
        for (const m of messages) {
            const list = byUser.get(m.userId) ?? [];
            list.push(m);
            byUser.set(m.userId, list);
        }
        return Array.from(byUser.entries())
            .map(([userId, list]) => {
                const sorted = [...list].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
                return {
                    userId,
                    userName: sorted[0].userName,
                    messages: sorted,
                    unreadCount: sorted.filter((m) => !m.readed).length,
                    lastMessage: sorted[0],
                };
            })
            .sort((a, b) => new Date(b.lastMessage.created).getTime() - new Date(a.lastMessage.created).getTime());
    }, [messages]);

    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [replyText, setReplyText] = useState('');

    const activeThread = threads.find((t) => t.userId === selectedUserId) ?? threads[0] ?? null;

    const handleSelect = (thread: Thread) => {
        setSelectedUserId(thread.userId);
        thread.messages.filter((m) => !m.readed).forEach((m) => setRead(m.id));
    };

    const handleSend = async () => {
        if (!activeThread || !replyText.trim()) return;
        try {
            await sendMessage({
                userId: activeThread.userId,
                subject: t('admin.chatPanel.replySubject'),
                content: replyText.trim(),
            }).unwrap();
            setReplyText('');
            antMessage.success(t('admin.chatPanel.sendSuccess'));
        } catch {
            antMessage.error(t('admin.chatPanel.sendError'));
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-10">
                <Spin />
            </div>
        );
    }

    if (threads.length === 0) {
        return <Empty description={t('admin.chatPanel.emptyThreads')} />;
    }

    return (
        <div className="flex h-[340px] gap-3 overflow-hidden">
            <div className="w-2/5 overflow-y-auto flex flex-col gap-1 pr-2 border-r border-white/5">
                {threads.map((t) => (
                    <button
                        key={t.userId}
                        onClick={() => handleSelect(t)}
                        className={`text-left px-3 py-2.5 rounded-lg transition-colors ${
                            activeThread?.userId === t.userId ? 'bg-mm-purple/20' : 'hover:bg-white/5'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-white text-sm font-medium truncate">{t.userName}</span>
                            {t.unreadCount > 0 && (
                                <span className="bg-mm-purple text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                                    {t.unreadCount}
                                </span>
                            )}
                        </div>
                        <div className="text-gray-400 text-xs truncate">{t.lastMessage.message.subject}</div>
                    </button>
                ))}
            </div>

            <div className="w-3/5 flex flex-col min-h-0">
                {activeThread ? (
                    <>
                        <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                            {activeThread.messages
                                .slice()
                                .reverse()
                                .map((m) => (
                                    <div key={m.id} className="bg-white/5 rounded-lg p-2.5">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className="text-white text-xs font-semibold">{m.message.subject}</span>
                                            <span className="text-gray-500 text-[10px] shrink-0">{formatTime(m.created)}</span>
                                        </div>
                                        <div className="text-gray-300 text-xs whitespace-pre-wrap">{m.message.content}</div>
                                    </div>
                                ))}
                        </div>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                            <Input
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onPressEnter={handleSend}
                                placeholder={t('admin.chatPanel.replyPlaceholder')}
                                className="admin-header-search"
                            />
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                loading={isSending}
                                onClick={handleSend}
                                className="bg-mm-purple"
                            />
                        </div>
                    </>
                ) : (
                    <Empty description={t('admin.chatPanel.selectThread')} />
                )}
            </div>
        </div>
    );
};

export default AdminChatPanel;
