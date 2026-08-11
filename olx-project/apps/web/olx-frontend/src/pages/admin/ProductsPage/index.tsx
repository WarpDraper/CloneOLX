import React, { useMemo, useState } from 'react';
import { Table, Input, Select, Button, Empty } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetProductsQuery, type IAdminProductItem } from '../../../services/adminService';
import { useGetCategoriesQuery } from '../../../services/categoryService';

const formatUAH = (value: number) =>
    new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', maximumFractionDigits: 0 }).format(value);

const STATUS_CLASS: Record<string, string> = {
    active: 'bg-emerald-500/15 text-emerald-600',
    sold: 'bg-sky-500/15 text-sky-600',
    pending: 'bg-amber-500/15 text-amber-600',
    blocked: 'bg-red-500/15 text-red-600',
};

const ProductsPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { data: products = [], isLoading } = useGetProductsQuery();
    const STATUS_LABEL: Record<string, { label: string; className: string }> = {
        active: { label: t('admin.products.status.active'), className: STATUS_CLASS.active },
        sold: { label: t('admin.products.status.sold'), className: STATUS_CLASS.sold },
        pending: { label: t('admin.products.status.pending'), className: STATUS_CLASS.pending },
        blocked: { label: t('admin.products.status.blocked'), className: STATUS_CLASS.blocked },
    };
    const { data: categories = [] } = useGetCategoriesQuery();
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<number | null>(null);

    const filtered = useMemo(() => {
        return products.filter((p) => {
            if (categoryFilter) {
                const catName = categories.find((c) => c.id === categoryFilter)?.name;
                if (catName && p.category !== catName) return false;
            }
            if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [products, categoryFilter, categories, search]);

    const columns: ColumnsType<IAdminProductItem> = [
        { title: t('admin.products.table.id'), dataIndex: 'id', key: 'id', width: 70, render: (id) => `#${id}` },
        { title: t('admin.products.table.title'), dataIndex: 'title', key: 'title', ellipsis: true },
        { title: t('admin.products.table.category'), dataIndex: 'category', key: 'category', width: 180 },
        { title: t('admin.products.table.price'), dataIndex: 'price', key: 'price', width: 120, render: (v) => formatUAH(v) },
        { title: t('admin.products.table.salesCount'), dataIndex: 'salesCount', key: 'salesCount', width: 110 },
        {
            title: t('admin.products.table.status'),
            dataIndex: 'status',
            key: 'status',
            width: 130,
            render: (s: string) => {
                const meta = STATUS_LABEL[s] ?? { label: s, className: 'bg-gray-500/15 text-gray-600' };
                return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.className}`}>{meta.label}</span>;
            },
        },
    ];

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-bold text-[#002f34] m-0">{t('admin.products.title')}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                    <Input
                        prefix={<SearchOutlined className="text-gray-400" />}
                        placeholder={t('admin.products.searchPlaceholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-56"
                    />
                    <Select
                        allowClear
                        placeholder={t('admin.common.categoryPlaceholder')}
                        className="w-48"
                        value={categoryFilter ?? undefined}
                        onChange={(v) => setCategoryFilter(v ?? null)}
                        options={categories.map((c) => ({ value: c.id, label: c.name }))}
                    />
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/adverts/create')} className="bg-mm-orange border-none">
                        {t('admin.products.addButton')}
                    </Button>
                </div>
            </div>

            <Table
                columns={columns}
                dataSource={filtered}
                rowKey="id"
                loading={isLoading}
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: <Empty description={t('admin.products.empty')} /> }}
            />
        </div>
    );
};

export default ProductsPage;
