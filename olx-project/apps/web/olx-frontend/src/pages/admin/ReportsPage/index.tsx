import React from 'react';
import { Table, Button, Tag, Space, message, Popconfirm } from 'antd';
import { CheckCircleOutlined, DeleteOutlined, StopOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useDispatch } from 'react-redux';
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
    const { data: reports = [], isLoading } = useGetReportsQuery();
    // ПРАВИЛЬНО: Викликаємо нову мутацію розв'язання скарги
    const [resolveReport] = useResolveReportMutation();
    const [toggleBlock] = useToggleUserBlockMutation();
    const dispatch = useDispatch();

    const handleStatusChange = async (id: string, newStatus: 'resolved' | 'dismissed') => {
        try {
            await resolveReport({ reportId: id, status: newStatus }).unwrap();

            message.success(`Скаргу ${id} позначено як ${newStatus === 'resolved' ? 'вирішену' : 'відхилену'}`);
        } catch {
            message.error('Помилка оновлення статусу. Перевірте підключення до API.');
        }
    };

    const handleBlockUser = async (targetId: string) => {
        try {
            await toggleBlock(targetId).unwrap();
            dispatch(addNotification({
                type: 'warning',
                title: 'Блокування',
                message: `Користувача ${targetId} було заблоковано за скаргою.`,
            }));
            message.warning(`Користувача ${targetId} успішно заблоковано.`);
        } catch {
            message.error('Помилка блокування користувача. Перевірте підключення до API.');
        }
    };

    const columns: ColumnsType<ReportData> = [
        { title: 'ID Скарги', dataIndex: 'id', key: 'id', width: 90 },
        { title: 'Хто поскаржився', dataIndex: 'reporterName', key: 'reporterName' },
        {
            title: 'Об\'єкт',
            key: 'target',
            render: (_, record) => (
                <span className="font-semibold text-blue-600 cursor-pointer hover:underline">
          {record.targetType === 'ad' ? 'Оголошення ' : 'Користувач '}
                    {record.targetId}
        </span>
            )
        },
        { title: 'Причина', dataIndex: 'reason', key: 'reason' },
        { title: 'Дата', dataIndex: 'date', key: 'date', width: 140 },
        {
            title: 'Статус',
            key: 'status',
            width: 120,
            render: (_, record) => {
                const colors = {
                    pending: 'orange',
                    resolved: 'green',
                    dismissed: 'default'
                };
                const labels = {
                    pending: 'Очікує',
                    resolved: 'Вирішено',
                    dismissed: 'Відхилено'
                };
                return <Tag color={colors[record.status]}>{labels[record.status]}</Tag>;
            }
        },
        {
            title: 'Статус',
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
                    pending: 'Очікує',
                    resolved: 'Вирішено',
                    dismissed: 'Відхилено',
                    '0': 'Очікує',
                    '1': 'Вирішено',
                    '2': 'Відхилено'
                };
                return <Tag color={colors[currentStatus] || 'orange'}>{labels[currentStatus] || 'Очікує'}</Tag>;
            }
        },
        {
            title: 'Дії',
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
                                    Підтвердити
                                </Button>
                                <Button
                                    type="default"
                                    icon={<DeleteOutlined />}
                                    size="small"
                                    onClick={() => handleStatusChange(record.id, 'dismissed')}
                                >
                                    Відхилити
                                </Button>
                                {record.targetType === 'user' && (
                                    <Popconfirm
                                        title="Заблокувати користувача?"
                                        description="Ви впевнені, що хочете заблокувати порушника?"
                                        onConfirm={() => handleBlockUser(record.targetId)}
                                        okText="Так"
                                        cancelText="Ні"
                                    >
                                        <Button danger size="small" icon={<StopOutlined />}>
                                            Блок
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
                <h1 className="text-2xl font-bold text-[#002f34]">Обробка скарг</h1>
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