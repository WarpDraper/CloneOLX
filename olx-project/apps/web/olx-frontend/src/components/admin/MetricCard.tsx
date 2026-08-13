import React from 'react';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

interface MetricCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    trend: number;
    accent?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, trend, accent = 'bg-mm-purple' }) => {
    const isPositive = trend >= 0;
    return (
        <div className="bg-[#12141c] rounded-2xl p-5 flex flex-col gap-3 min-w-0">
            <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg ${accent}`}>
                    {icon}
                </div>
                <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${
                        isPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    }`}
                >
                    {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    {Math.abs(trend).toFixed(1)}%
                </span>
            </div>
            <div>
                <div className="text-2xl font-bold text-white truncate">{value}</div>
                <div className="text-gray-400 text-sm mt-0.5">{label}</div>
            </div>
        </div>
    );
};

export default MetricCard;
