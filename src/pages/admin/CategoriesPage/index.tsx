import React from 'react';
import { Table, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { useGetCategoriesQuery } from '../../../services/categoryService';
import type { ICategory } from '../../../types/category/ICategory';

const CategoriesPage: React.FC = () => {
    const { t } = useTranslation();
    const { data: categories = [], isLoading } = useGetCategoriesQuery();

    const columns: ColumnsType<ICategory> = [
        { title: t('admin.categories.table.id'), dataIndex: 'id', key: 'id', width: 80 },
        { title: t('admin.categories.table.name'), dataIndex: 'name', key: 'name' },
        { title: t('admin.categories.table.parent'), dataIndex: 'parentName', key: 'parentName', render: (v) => v || '—' },
        { title: t('admin.categories.table.filters'), dataIndex: 'filterNames', key: 'filterNames', render: (v: string[]) => v.join(', ') || '—' },
    ];

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold text-[#002f34] m-0">{t('admin.categories.title')}</h1>
            <Table
                columns={columns}
                dataSource={categories}
                rowKey="id"
                loading={isLoading}
                pagination={{ pageSize: 15 }}
                locale={{ emptyText: <Empty description={t('admin.categories.empty')} /> }}
            />
        </div>
    );
};

export default CategoriesPage;
