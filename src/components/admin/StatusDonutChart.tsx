import React from 'react';

interface StatusDatum {
    status: string;
    label: string;
    count: number;
    percent: number;
}

interface StatusDonutChartProps {
    data: StatusDatum[];
}

const COLORS: Record<string, string> = {
    paid: '#6648D2',
    processing: '#F5A623',
    shipped: '#23C0E5',
    cancelled: '#F16063',
};

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Dependency-free SVG donut chart (stacked stroke segments) — mirrors SalesBarChart's rationale
// for not pulling in a charting library.
const StatusDonutChart: React.FC<StatusDonutChartProps> = ({ data }) => {
    let cumulative = 0;
    const total = data.reduce((sum, d) => sum + d.percent, 0);
    const hasData = total > 0;

    return (
        <div className="flex items-center gap-6">
            <svg viewBox="0 0 100 100" className="w-40 h-40 shrink-0 -rotate-90">
                {hasData ? (
                    data.map((d) => {
                        const dash = (d.percent / 100) * CIRCUMFERENCE;
                        const gap = CIRCUMFERENCE - dash;
                        const offset = -((cumulative / 100) * CIRCUMFERENCE);
                        cumulative += d.percent;
                        return (
                            <circle
                                key={d.status}
                                cx={50}
                                cy={50}
                                r={RADIUS}
                                fill="none"
                                stroke={COLORS[d.status] ?? '#999'}
                                strokeWidth={14}
                                strokeDasharray={`${dash} ${gap}`}
                                strokeDashoffset={offset}
                            >
                                <title>{`${d.label}: ${d.percent}%`}</title>
                            </circle>
                        );
                    })
                ) : (
                    <circle cx={50} cy={50} r={RADIUS} fill="none" stroke="#22252f" strokeWidth={14} />
                )}
            </svg>
            <div className="flex flex-col gap-2.5">
                {data.map((d) => (
                    <div key={d.status} className="flex items-center gap-2 text-sm">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[d.status] ?? '#999' }} />
                        <span className="text-gray-300">{d.label}</span>
                        <span className="text-white font-semibold">{d.percent}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StatusDonutChart;
