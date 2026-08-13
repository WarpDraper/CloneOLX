import React, { useMemo, useState } from 'react';
import { Table, DatePicker, Input, Select, Button, message, Empty, Spin } from 'antd';
import { ShareAltOutlined, DownloadOutlined, SearchOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import dayjs, { type Dayjs } from 'dayjs';
import {
    useGetOrdersQuery,
    useGetProductsQuery,
    type IAdminOrderItem,
    type IAdminProductItem,
} from '../../../services/adminService';
import { useGetCategoriesQuery } from '../../../services/categoryService';
import OrderStatusBadge from '../../../components/admin/OrderStatusBadge';
import AdminChatPanel from '../../../components/admin/AdminChatPanel';

const { RangePicker } = DatePicker;

const formatUAH = (value: number) =>
    new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', maximumFractionDigits: 0 }).format(value);

const formatDate = (value: string) =>
    new Date(value).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const OrdersPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const FILTER_TABS: Array<{ key: string; label: string }> = [
        { key: 'all', label: t('admin.orders.tabs.all') },
        { key: 'paid', label: t('admin.orders.tabs.paid') },
        { key: 'processing', label: t('admin.orders.tabs.processing') },
        { key: 'shipped', label: t('admin.orders.tabs.shipped') },
        { key: 'cancelled', label: t('admin.orders.tabs.cancelled') },
    ];

    const PRODUCT_STATUS_LABEL: Record<string, string> = {
        active: t('admin.products.status.active'),
        sold: t('admin.products.status.sold'),
        pending: t('admin.products.status.pending'),
        blocked: t('admin.products.status.blocked'),
    };

    const { data: orders = [], isLoading: ordersLoading } = useGetOrdersQuery();
    const { data: products = [], isLoading: productsLoading } = useGetProductsQuery();
    const { data: categories = [] } = useGetCategoriesQuery();

    const [activeTab, setActiveTab] = useState('all');
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
    const [productSearch, setProductSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<number | null>(null);

    const filteredOrders = useMemo(() => {
        return orders.filter((o) => {
            if (activeTab !== 'all' && o.status !== activeTab) return false;
            if (dateRange && dateRange[0] && dateRange[1]) {
                const d = dayjs(o.date);
                if (d.isBefore(dateRange[0], 'day') || d.isAfter(dateRange[1], 'day')) return false;
            }
            return true;
        });
    }, [orders, activeTab, dateRange]);

    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            if (categoryFilter) {
                const catName = categories.find((c) => c.id === categoryFilter)?.name;
                if (catName && p.category !== catName) return false;
            }
            if (productSearch && !p.title.toLowerCase().includes(productSearch.toLowerCase())) return false;
            return true;
        });
    }, [products, categoryFilter, categories, productSearch]);

    const handleExport = () => {
        const header = [
            t('admin.orders.export.headers.id'),
            t('admin.orders.export.headers.customer'),
            t('admin.orders.export.headers.product'),
            t('admin.orders.export.headers.price'),
            t('admin.orders.export.headers.status'),
            t('admin.orders.export.headers.date'),
        ];
        const rows = filteredOrders.map((o) => [o.id, o.customerName, o.productName, o.price, o.status, o.date]);
        const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders_${dayjs().format('YYYY-MM-DD')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleShare = async () => {
        const url = `${window.location.origin}/admin/orders`;
        try {
            await navigator.clipboard.writeText(url);
            message.success(t('admin.orders.share.copied'));
        } catch {
            message.error(t('admin.orders.share.copyFailed'));
        }
    };

    const orderColumns: ColumnsType<IAdminOrderItem> = [
        { title: t('admin.orders.table.id'), dataIndex: 'id', key: 'id', width: 110, render: (id) => `#${id}` },
        { title: t('admin.orders.table.customer'), dataIndex: 'customerName', key: 'customerName' },
        { title: t('admin.orders.table.product'), dataIndex: 'productName', key: 'productName', ellipsis: true },
        { title: t('admin.orders.table.price'), dataIndex: 'price', key: 'price', render: (v) => formatUAH(v) },
        { title: t('admin.orders.table.status'), dataIndex: 'status', key: 'status', render: (s) => <OrderStatusBadge status={s} /> },
        { title: t('admin.orders.table.date'), dataIndex: 'date', key: 'date', render: (d) => formatDate(d) },
    ];

    const productColumns: ColumnsType<IAdminProductItem> = [
        { title: t('admin.products.table.title'), dataIndex: 'title', key: 'title', ellipsis: true },
        { title: t('admin.products.table.category'), dataIndex: 'category', key: 'category', width: 140, ellipsis: true },
        { title: t('admin.products.table.price'), dataIndex: 'price', key: 'price', width: 100, render: (v) => formatUAH(v) },
        { title: t('admin.products.table.salesCount'), dataIndex: 'salesCount', key: 'salesCount', width: 90 },
        {
            title: t('admin.products.table.status'),
            dataIndex: 'status',
            key: 'status',
            width: 110,
            render: (s: string) => <span className="text-gray-300 text-xs">{PRODUCT_STATUS_LABEL[s] ?? s}</span>,
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-[#12141c] rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex flex-wrap gap-2">
                        {FILTER_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors ${
                                    activeTab === tab.key ? 'bg-mm-purple text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <RangePicker
                            onChange={(vals) => setDateRange(vals as [Dayjs | null, Dayjs | null] | null)}
                            className="admin-header-search"
                        />
                        <Button icon={<ShareAltOutlined />} onClick={handleShare}>
                            {t('admin.orders.actions.share')}
                        </Button>
                        <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport} className="bg-mm-purple">
                            {t('admin.orders.actions.export')}
                        </Button>
                    </div>
                </div>

                <Table
                    columns={orderColumns}
                    dataSource={filteredOrders}
                    rowKey="id"
                    loading={ordersLoading}
                    className="admin-dark-table"
                    pagination={{ pageSize: 10, showSizeChanger: false }}
                    locale={{ emptyText: <Empty description={t('admin.orders.empty')} /> }}
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="bg-[#12141c] rounded-2xl p-5 min-h-[420px]">
                    <h3 className="text-white font-bold text-base m-0 mb-4">{t('admin.chats.title')}</h3>
                    <AdminChatPanel />
                </div>

                <div className="bg-[#12141c] rounded-2xl p-5">
                    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                        <h3 className="text-white font-bold text-base m-0">{t('admin.orders.productsPanel.title')}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Input
                                prefix={<SearchOutlined className="text-gray-400" />}
                                placeholder={t('admin.products.searchPlaceholder')}
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                className="admin-header-search w-48"
                            />
                            <Select
                                allowClear
                                placeholder={t('admin.common.categoryPlaceholder')}
                                className="w-40"
                                value={categoryFilter ?? undefined}
                                onChange={(v) => setCategoryFilter(v ?? null)}
                                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                            />
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => navigate('/adverts/create')}
                                className="bg-mm-orange border-none"
                            >
                                {t('admin.products.addButton')}
                            </Button>
                        </div>
                    </div>
                    {productsLoading ? (
                        <div className="flex justify-center py-10">
                            <Spin />
                        </div>
                    ) : (
                        <Table
                            columns={productColumns}
                            dataSource={filteredProducts}
                            rowKey="id"
                            className="admin-dark-table"
                            pagination={{ pageSize: 8, showSizeChanger: false }}
                            locale={{ emptyText: <Empty description={t('admin.products.empty')} /> }}
                            size="small"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrdersPage;
