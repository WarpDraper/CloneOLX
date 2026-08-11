import React, { useState } from 'react';
import { Table, Spin, Empty } from 'antd';
import {
    DollarOutlined,
    ShoppingCartOutlined,
    TeamOutlined,
    ShopOutlined,
    MessageOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { useGetDashboardOverviewQuery, useGetUsersQuery, type IAdminOrderItem } from '../../../services/adminService';
import { useGetAdminMessagesQuery } from '../../../services/adminMessageService';
import MetricCard from '../../../components/admin/MetricCard';
import SalesBarChart from '../../../components/admin/SalesBarChart';
import StatusDonutChart from '../../../components/admin/StatusDonutChart';
import OrderStatusBadge from '../../../components/admin/OrderStatusBadge';

const formatUAH = (value: number) =>
    new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', maximumFractionDigits: 0 }).format(value);

const formatDate = (value: string) => new Date(value).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const OverviewPage: React.FC = () => {
    const { t } = useTranslation();
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');
    const { data, isLoading } = useGetDashboardOverviewQuery({ period });
    const { data: users = [], isLoading: usersLoading } = useGetUsersQuery();
    const { data: messages = [] } = useGetAdminMessagesQuery();

    const PERIODS: Array<{ key: 'week' | 'month' | 'year'; label: string }> = [
        { key: 'week', label: t('admin.overview.periods.week') },
        { key: 'month', label: t('admin.overview.periods.month') },
        { key: 'year', label: t('admin.overview.periods.year') },
    ];

    const orderColumns: ColumnsType<IAdminOrderItem> = [
        { title: t('admin.overview.table.id'), dataIndex: 'id', key: 'id', width: 70, render: (id) => `#${id}` },
        { title: t('admin.overview.table.customer'), dataIndex: 'customerName', key: 'customerName' },
        { title: t('admin.overview.table.product'), dataIndex: 'productName', key: 'productName', ellipsis: true },
        { title: t('admin.overview.table.price'), dataIndex: 'price', key: 'price', render: (v) => formatUAH(v) },
        { title: t('admin.overview.table.status'), dataIndex: 'status', key: 'status', render: (s) => <OrderStatusBadge status={s} /> },
        { title: t('admin.overview.table.date'), dataIndex: 'date', key: 'date', render: (d) => formatDate(d) },
    ];

    if (isLoading || !data) {
        return (
            <div className="flex items-center justify-center py-24">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricCard
                    icon={<DollarOutlined />}
                    label={t('admin.overview.metrics.totalSold')}
                    value={formatUAH(data.metrics.totalSold.value)}
                    trend={data.metrics.totalSold.trend}
                    accent="bg-mm-purple"
                />
                <MetricCard
                    icon={<ShoppingCartOutlined />}
                    label={t('admin.overview.metrics.orders')}
                    value={data.metrics.orders.value.toLocaleString('uk-UA')}
                    trend={data.metrics.orders.trend}
                    accent="bg-mm-orange"
                />
                <MetricCard
                    icon={<TeamOutlined />}
                    label={t('admin.overview.metrics.users')}
                    value={data.metrics.users.value.toLocaleString('uk-UA')}
                    trend={data.metrics.users.trend}
                    accent="bg-sky-500"
                />
                <MetricCard
                    icon={<ShopOutlined />}
                    label={t('admin.overview.metrics.sellers')}
                    value={data.metrics.sellers.value.toLocaleString('uk-UA')}
                    trend={data.metrics.sellers.trend}
                    accent="bg-emerald-500"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 bg-[#12141c] rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-bold text-base m-0">{t('admin.overview.salesDynamics.title')}</h3>
                        <div className="flex bg-white/5 rounded-lg p-1">
                            {PERIODS.map((p) => (
                                <button
                                    key={p.key}
                                    onClick={() => setPeriod(p.key)}
                                    className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                                        period === p.key ? 'bg-mm-purple text-white' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <SalesBarChart data={data.salesDynamics} />
                </div>

                <div className="bg-[#12141c] rounded-2xl p-5">
                    <h3 className="text-white font-bold text-base m-0 mb-4">{t('admin.overview.orderStatus.title')}</h3>
                    <StatusDonutChart data={data.orderStatusBreakdown} />
                </div>
            </div>

            {/* Recent orders + popular products */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 bg-[#12141c] rounded-2xl p-5">
                    <h3 className="text-white font-bold text-base m-0 mb-4">{t('admin.overview.recentOrders.title')}</h3>
                    <Table
                        columns={orderColumns}
                        dataSource={data.recentOrders}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        className="admin-dark-table"
                        locale={{ emptyText: <Empty description={t('admin.overview.recentOrders.empty')} /> }}
                    />
                </div>

                <div className="bg-[#12141c] rounded-2xl p-5">
                    <h3 className="text-white font-bold text-base m-0 mb-4">{t('admin.overview.popularProducts.title')}</h3>
                    <div className="flex flex-col gap-3">
                        {data.popularProducts.length === 0 && <Empty description={t('admin.overview.popularProducts.empty')} />}
                        {data.popularProducts.map((p) => (
                            <div key={p.id} className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                                <div className="min-w-0">
                                    <div className="text-white text-sm font-medium truncate">{p.title}</div>
                                    <div className="text-gray-400 text-xs">{t('admin.overview.popularProducts.stats', { sales: p.salesCount, favorites: p.favoritesCount })}</div>
                                </div>
                                <div className="text-white text-sm font-semibold shrink-0">{formatUAH(p.price)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Users + mini chat */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 bg-[#12141c] rounded-2xl p-5">
                    <h3 className="text-white font-bold text-base m-0 mb-4">{t('admin.overview.usersTable.title')}</h3>
                    <Table
                        loading={usersLoading}
                        columns={[
                            { title: t('admin.overview.usersTable.columns.name'), dataIndex: 'name', key: 'name' },
                            { title: t('admin.overview.usersTable.columns.email'), dataIndex: 'email', key: 'email' },
                            { title: t('admin.overview.usersTable.columns.registerDate'), dataIndex: 'registerDate', key: 'registerDate' },
                            {
                                title: t('admin.overview.usersTable.columns.status'),
                                dataIndex: 'status',
                                key: 'status',
                                render: (s: string) => (
                                    <span className={s === 'active' ? 'text-emerald-500' : 'text-red-500'}>
                                        {s === 'active' ? t('admin.users.status.active') : t('admin.users.status.blocked')}
                                    </span>
                                ),
                            },
                        ]}
                        dataSource={users.slice(0, 5)}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        className="admin-dark-table"
                    />
                </div>

                <div className="bg-[#12141c] rounded-2xl p-5 flex flex-col">
                    <h3 className="text-white font-bold text-base m-0 mb-4 flex items-center gap-2">
                        <MessageOutlined /> {t('admin.chats.title')}
                    </h3>
                    <div className="flex flex-col gap-3 overflow-y-auto max-h-72">
                        {messages.length === 0 && <Empty description={t('admin.overview.chats.empty')} />}
                        {messages.slice(0, 6).map((m) => (
                            <div key={m.id} className="flex items-start gap-2 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${m.readed ? 'bg-gray-600' : 'bg-mm-purple'}`} />
                                <div className="min-w-0">
                                    <div className="text-white text-sm font-medium truncate">{m.userName}</div>
                                    <div className="text-gray-400 text-xs truncate">{m.message.subject}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverviewPage;
