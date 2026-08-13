import React from 'react';
import { useTranslation } from 'react-i18next';

const STATUS_CLASS: Record<string, string> = {
    paid: 'bg-emerald-500/15 text-emerald-600',
    processing: 'bg-amber-500/15 text-amber-600',
    shipped: 'bg-sky-500/15 text-sky-600',
    cancelled: 'bg-red-500/15 text-red-600',
};

const OrderStatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const { t } = useTranslation();
    const STATUS_MAP: Record<string, { label: string; className: string }> = {
        paid: { label: t('admin.orderStatus.paid'), className: STATUS_CLASS.paid },
        processing: { label: t('admin.orderStatus.processing'), className: STATUS_CLASS.processing },
        shipped: { label: t('admin.orderStatus.shipped'), className: STATUS_CLASS.shipped },
        cancelled: { label: t('admin.orderStatus.cancelled'), className: STATUS_CLASS.cancelled },
    };
    const meta = STATUS_MAP[status] ?? { label: status, className: 'bg-gray-500/15 text-gray-600' };
    return (
        <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${meta.className}`}>
            {meta.label}
        </span>
    );
};

export default OrderStatusBadge;
