import React from 'react';

interface SalesBarChartProps {
    data: Array<{ label: string; value: number }>;
    height?: number;
}

// Lightweight dependency-free SVG bar chart — the project has no charting library installed,
// and pulling one in just for this widget isn't worth the extra weight.
const SalesBarChart: React.FC<SalesBarChartProps> = ({ data, height = 220 }) => {
    const max = Math.max(1, ...data.map((d) => d.value));
    const barWidth = 100 / (data.length * 2);

    return (
        <div className="w-full" style={{ height }}>
            <svg viewBox={`0 0 100 ${100}`} preserveAspectRatio="none" className="w-full h-full">
                {[0, 25, 50, 75, 100].map((y) => (
                    <line key={y} x1={0} x2={100} y1={y} y2={y} stroke="#22252f" strokeWidth={0.3} />
                ))}
                {data.map((d, i) => {
                    const barHeight = (d.value / max) * 85;
                    const x = i * (100 / data.length) + barWidth / 2;
                    return (
                        <rect
                            key={i}
                            x={x}
                            y={95 - barHeight}
                            width={barWidth}
                            height={barHeight}
                            rx={1.2}
                            fill="url(#salesGradient)"
                        >
                            <title>{`${d.label}: ${d.value.toLocaleString('uk-UA')}`}</title>
                        </rect>
                    );
                })}
                <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#6648D2" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="flex justify-between px-1 mt-1">
                {data.map((d, i) => (
                    <span key={i} className="text-[11px] text-gray-400">
                        {d.label}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default SalesBarChart;
