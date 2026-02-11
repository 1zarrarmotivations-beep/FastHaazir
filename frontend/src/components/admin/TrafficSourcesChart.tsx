/**
 * Traffic Sources Chart
 * Pie chart showing traffic source distribution
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { TrafficSource } from '@/hooks/useAnalytics';

interface Props {
    data: TrafficSource[];
}

const COLORS = {
    direct: '#3b82f6',
    social: '#8b5cf6',
    search: '#10b981',
    referral: '#f59e0b',
    email: '#ef4444',
    other: '#6b7280'
};

export function TrafficSourcesChart({ data }: Props) {
    if (data.length === 0) {
        return (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No traffic data available
            </div>
        );
    }

    const chartData = data.map(item => ({
        name: item.source.charAt(0).toUpperCase() + item.source.slice(1),
        value: item.sessions,
        percentage: item.percentage
    }));

    return (
        <div className="space-y-4">
            <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {chartData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={COLORS[data[index].source as keyof typeof COLORS] || COLORS.other}
                            />
                        ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
            </ResponsiveContainer>

            {/* Legend with stats */}
            <div className="space-y-2">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: COLORS[item.source as keyof typeof COLORS] || COLORS.other }}
                            />
                            <span className="capitalize">{item.source}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">{item.sessions} sessions</span>
                            <span className="font-semibold">{item.percentage}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
