import React from 'react';
import { Table, Button, Tag, Space, message, Popconfirm, Tooltip } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, StopOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { addNotification } from '../../../store/notificationSlice';
import {
    useGetPendingReportsQuery,
    useResolveReportMutation,
    useRejectReportMutation,
    type IReportItem,
} from '../../../services/reportService';

const STATUS_COLORS: Record<IReportItem['status'], string> = {
    Pending: 'orange',
    Resolved: 'green',
    Rejected: 'default',
};

const ReportsPage: React.FC = () => {
    const { t } = useTranslation();
    const { data: reports = [], isLoading } = useGetPendingReportsQuery();
    const [resolveReport, { isLoading: isResolving }] = useResolveReportMutation();
    const [rejectReport, { isLoading: isRejecting }] = useRejectReportMutation();
    const dispatch = useDispatch();

    const handleResolve = async (report: IReportItem, extra?: { banUser?: boolean; unpublishAdvert?: boolean }) => {
        try {
            await resolveReport({ id: report.id, ...extra }).unwrap();
            message.success(t('admin.reports.messages.resolveSuccess', { id: report.id }));

            if (extra?.banUser) {
                dispatch(addNotification({
                    type: 'warning',
                    title: t('admin.reports.notifications.blockTitle'),
                    message: t('admin.reports.notifications.blockMessage', { id: report.id }),
                }));
            }
            if (extra?.unpublishAdvert) {
                dispatch(addNotification({
                    type: 'warning',
                    title: t('admin.reports.notifications.unpublishTitle'),
                    message: t('admin.reports.notifications.unpublishMessage', { id: report.id }),
                }));
            }
        } catch {
            message.error(t('admin.reports.messages.updateError'));
        }
    };

    const handleReject = async (report: IReportItem) => {
        try {
            await rejectReport({ id: report.id }).unwrap();
            message.success(t('admin.reports.messages.rejectSuccess', { id: report.id }));
        } catch {
            message.error(t('admin.reports.messages.updateError'));
        }
    };

    const columns: ColumnsType<IReportItem> = [
        { title: t('admin.reports.table.id'), dataIndex: 'id', key: 'id', width: 80 },
        {
            title: t('admin.reports.table.reporter'),
            key: 'reporter',
            render: (_, record) => (
                <div className="min-w-0">
                    <p className="font-medium text-mm-navy truncate">{record.reporterName}</p>
                    <p className="text-xs text-gray-400 truncate">{record.reporterEmail}</p>
                </div>
            ),
        },
        {
            title: t('admin.reports.table.target'),
            key: 'target',
            render: (_, record) => (
                <Link
                    to={record.targetType === 'advert' ? `/advert/${record.targetId}` : `/profile/${record.targetId}`}
                    className="font-semibold text-blue-600 hover:underline"
                    target="_blank"
                >
                    {record.targetType === 'advert' ? t('admin.reports.targetType.advert') : t('admin.reports.targetType.user')}
                    {': '}{record.targetLabel}
                </Link>
            ),
        },
        {
            title: t('admin.reports.table.reason'),
            key: 'reason',
            render: (_, record) => (
                <div className="max-w-[220px]">
                    <p className="text-sm text-mm-navy">{record.reason}</p>
                    {record.description && (
                        <Tooltip title={record.description}>
                            <p className="text-xs text-gray-400 truncate">{record.description}</p>
                        </Tooltip>
                    )}
                </div>
            ),
        },
        {
            title: t('admin.reports.table.date'),
            key: 'date',
            width: 140,
            render: (_, record) => new Date(record.createdAt).toLocaleDateString('uk-UA'),
        },
        {
            title: t('admin.reports.table.status'),
            key: 'status',
            width: 110,
            render: (_, record) => (
                <Tag color={STATUS_COLORS[record.status] ?? 'orange'}>
                    {t(`admin.reports.status.${record.status}`)}
                </Tag>
            ),
        },
        {
            title: t('admin.reports.table.actions'),
            key: 'actions',
            render: (_, record) => {
                if (record.status !== 'Pending') return null;

                return (
                    <Space size="small" wrap>
                        <Popconfirm
                            title={t('admin.reports.confirm.resolveTitle')}
                            description={t('admin.reports.confirm.resolveDescription')}
                            onConfirm={() => handleResolve(record)}
                            okText={t('admin.common.yes')}
                            cancelText={t('admin.common.no')}
                        >
                            <Button
                                type="primary"
                                icon={<CheckCircleOutlined />}
                                size="small"
                                className="bg-green-600 hover:!bg-green-500"
                                loading={isResolving}
                            >
                                {t('admin.reports.actions.resolve')}
                            </Button>
                        </Popconfirm>

                        <Popconfirm
                            title={t('admin.reports.confirm.rejectTitle')}
                            description={t('admin.reports.confirm.rejectDescription')}
                            onConfirm={() => handleReject(record)}
                            okText={t('admin.common.yes')}
                            cancelText={t('admin.common.no')}
                        >
                            <Button icon={<CloseCircleOutlined />} size="small" loading={isRejecting}>
                                {t('admin.reports.actions.reject')}
                            </Button>
                        </Popconfirm>

                        {record.targetType === 'user' && (
                            <Popconfirm
                                title={t('admin.reports.confirm.banTitle')}
                                description={t('admin.reports.confirm.banDescription')}
                                onConfirm={() => handleResolve(record, { banUser: true })}
                                okText={t('admin.common.yes')}
                                cancelText={t('admin.common.no')}
                            >
                                <Button danger icon={<StopOutlined />} size="small">
                                    {t('admin.reports.actions.banAndResolve')}
                                </Button>
                            </Popconfirm>
                        )}

                        {record.targetType === 'advert' && (
                            <Popconfirm
                                title={t('admin.reports.confirm.unpublishTitle')}
                                description={t('admin.reports.confirm.unpublishDescription')}
                                onConfirm={() => handleResolve(record, { unpublishAdvert: true })}
                                okText={t('admin.common.yes')}
                                cancelText={t('admin.common.no')}
                            >
                                <Button danger icon={<EyeInvisibleOutlined />} size="small">
                                    {t('admin.reports.actions.unpublishAndResolve')}
                                </Button>
                            </Popconfirm>
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
                locale={{ emptyText: t('admin.reports.empty') }}
            />
        </div>
    );
};

export default ReportsPage;
