import React from 'react';
import { Table, Empty, Rate } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { useGetSellersQuery, type IAdminSellerItem } from '../../../services/adminService';

const SellersPage: React.FC = () => {
    const { t } = useTranslation();
    const { data: sellers = [], isLoading } = useGetSellersQuery();

    const columns: ColumnsType<IAdminSellerItem> = [
        { title: t('admin.sellers.table.id'), dataIndex: 'id', key: 'id', width: 80 },
        { title: t('admin.sellers.table.name'), dataIndex: 'name', key: 'name' },
        { title: t('admin.sellers.table.email'), dataIndex: 'email', key: 'email' },
        { title: t('admin.sellers.table.productsCount'), dataIndex: 'productsCount', key: 'productsCount', width: 110 },
        { title: t('admin.sellers.table.salesCount'), dataIndex: 'salesCount', key: 'salesCount', width: 110 },
        {
            title: t('admin.sellers.table.rating'),
            dataIndex: 'rating',
            key: 'rating',
            width: 180,
            render: (v: number) => <Rate disabled allowHalf defaultValue={v} />,
        },
    ];

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold text-[#002f34] m-0">{t('admin.sellers.title')}</h1>
            <Table
                columns={columns}
                dataSource={sellers}
                rowKey="id"
                loading={isLoading}
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: <Empty description={t('admin.sellers.empty')} /> }}
            />
        </div>
    );
};

export default SellersPage;
