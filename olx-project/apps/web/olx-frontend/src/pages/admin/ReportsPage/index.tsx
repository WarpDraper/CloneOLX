import React from 'react';
import { Table, Button, Tag, Space, message, Popconfirm } from 'antd';
import { CheckCircleOutlined, DeleteOutlined, StopOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { addNotification } from '../../../store/notificationSlice';
import { useToggleUserBlockMutation } from '../../../services/adminService.ts';

import { useGetReportsQuery, useResolveReportMutation } from '../../../services/reportService.ts';

interface ReportData {
    id: string;
    reporterName: string;
    targetId: string;
    targetType: 'user' | 'ad';
    reason: string;
    status: 'pending' | 'resolved' | 'dismissed';
    date: string;
}

const ReportsPage: React.FC = () => {
    const { t } = useTranslation();
    const { data: reports = [], isLoading } = useGetReportsQuery();
    // ПРАВИЛЬНО: Викликаємо нову мутацію розв'язання скарги
    const [resolveReport] = useResolveReportMutation();
    const [toggleBlock] = useToggleUserBlockMutation();
    const dispatch = useDispatch();

    const handleStatusChange = async (id: string, newStatus: 'resolved' | 'dismissed') => {
        try {
            await resolveReport({ reportId: id, status: newStatus }).unwrap();

            message.success(t('admin.reports.messages.statusChanged', {
                id,
                status: newStatus === 'resolved' ? t('admin.reports.statusVerb.resolved') : t('admin.reports.statusVerb.dismissed'),
            }));
        } catch {
            message.error(t('admin.reports.messages.updateError'));
        }
    };

    const handleBlockUser = async (targetId: string) => {
        try {
            await toggleBlock(targetId).unwrap();
            dispatch(addNotification({
                type: 'warning',
                title: t('admin.reports.notifications.blockTitle'),
                message: t('admin.reports.notifications.blockMessage', { targetId }),
            }));
            message.warning(t('admin.reports.messages.blockSuccess', { targetId }));
        } catch {
            message.error(t('admin.reports.messages.blockError'));
        }
    };

    const columns: ColumnsType<ReportData> = [
        { title: t('admin.reports.table.id'), dataIndex: 'id', key: 'id', width: 90 },
        { title: t('admin.reports.table.reporter'), dataIndex: 'reporterName', key: 'reporterName' },
        {
            title: t('admin.reports.table.target'),
            key: 'target',
            render: (_, record) => (
                <span className="font-semibold text-blue-600 cursor-pointer hover:underline">
          {record.targetType === 'ad' ? t('admin.reports.targetType.ad') : t('admin.reports.targetType.user')}{' '}
                    {record.targetId}
        </span>
            )
        },
        { title: t('admin.reports.table.reason'), dataIndex: 'reason', key: 'reason' },
        { title: t('admin.reports.table.date'), dataIndex: 'date', key: 'date', width: 140 },
        {
            title: t('admin.reports.table.status'),
            key: 'status',
            width: 120,
            render: (_, record) => {
                const colors = {
                    pending: 'orange',
                    resolved: 'green',
                    dismissed: 'default'
                };
                const labels = {
                    pending: t('admin.reports.status.pending'),
                    resolved: t('admin.reports.status.resolved'),
                    dismissed: t('admin.reports.status.dismissed')
                };
                return <Tag color={colors[record.status]}>{labels[record.status]}</Tag>;
            }
        },
        {
            title: t('admin.reports.table.status'),
            key: 'status',
            width: 120,
            render: (_, record) => {
                // Приводимо до нижнього регістру на випадок, якщо прийшло "Pending" або число
                const currentStatus = String(record.status).toLowerCase();

                const colors: Record<string, string> = {
                    pending: 'orange',
                    resolved: 'green',
                    dismissed: 'default',
                    '0': 'orange', // Додатковий захист, якщо бекенд шле enum як число
                    '1': 'green',
                    '2': 'default'
                };
                const labels: Record<string, string> = {
                    pending: t('admin.reports.status.pending'),
                    resolved: t('admin.reports.status.resolved'),
                    dismissed: t('admin.reports.status.dismissed'),
                    '0': t('admin.reports.status.pending'),
                    '1': t('admin.reports.status.resolved'),
                    '2': t('admin.reports.status.dismissed')
                };
                return <Tag color={colors[currentStatus] || 'orange'}>{labels[currentStatus] || t('admin.reports.status.pending')}</Tag>;
            }
        },
        {
            title: t('admin.reports.table.actions'),
            key: 'actions',
            render: (_, record) => {
                // Захищаємо умову відображення кнопок
                const normalizedStatus = String(record.status).toLowerCase();
                const isPending = normalizedStatus === 'pending' || normalizedStatus === '0';

                return (
                    <Space size="middle">
                        {isPending && (
                            <>
                                <Button
                                    type="primary"
                                    icon={<CheckCircleOutlined />}
                                    size="small"
                                    className="bg-green-600 hover:!bg-green-500"
                                    onClick={() => handleStatusChange(record.id, 'resolved')}
                                >
                                    {t('admin.reports.actions.confirm')}
                                </Button>
                                <Button
                                    type="default"
                                    icon={<DeleteOutlined />}
                                    size="small"
                                    onClick={() => handleStatusChange(record.id, 'dismissed')}
                                >
                                    {t('admin.reports.actions.dismiss')}
                                </Button>
                                {record.targetType === 'user' && (
                                    <Popconfirm
                                        title={t('admin.reports.blockConfirm.title')}
                                        description={t('admin.reports.blockConfirm.description')}
                                        onConfirm={() => handleBlockUser(record.targetId)}
                                        okText={t('admin.common.yes')}
                                        cancelText={t('admin.common.no')}
                                    >
                                        <Button danger size="small" icon={<StopOutlined />}>
                                            {t('admin.reports.actions.block')}
                                        </Button>
                                    </Popconfirm>
                                )}
                            </>
                        )}
                    </Space>
                );
            },
        },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-[#002f34]">{t('admin.reports.title')}</h1>
            </div>

            <Table
                columns={columns}
                dataSource={reports}
                rowKey="id"
                loading={isLoading}
                pagination={{ pageSize: 10 }}
            />
        </div>
    );
};

export default ReportsPage;