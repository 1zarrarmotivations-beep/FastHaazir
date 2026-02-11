/**
 * Device Breakdown Chart
 * Bar chart showing device type distribution
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Smartphone, Tablet, Monitor } from 'lucide-react';
import type { DeviceStats } from '@/hooks/useAnalytics';

interface Props {
    data: DeviceStats[];
}

const DEVICE_COLORS = {
    mobile: '#3b82f6',
    tablet: '#8b5cf6',
    desktop: '#10b981'
};

const DEVICE_ICONS = {
    mobile: Smartphone,
    tablet: Tablet,
    desktop: Monitor
};

export function DeviceBreakdownChart({ data }: Props) {
    if (data.length === 0) {
        return (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No device data available
            </div>
        );
    }

    const chartData = data.map(item => ({
        name: item.deviceType.charAt(0).toUpperCase() + item.deviceType.slice(1),
        value: item.count,
        percentage: item.percentage
    }));

    return (
        <div className="space-y-4">
            <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                        dataKey="name"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                        }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {chartData.map((entry, index) => {
                            const deviceType = data[index].deviceType as keyof typeof DEVICE_COLORS;
                            return (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={DEVICE_COLORS[deviceType] || '#6b7280'}
                                />
                            );
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Device stats */}
            <div className="space-y-2">
                {data.map((item, index) => {
                    const Icon = DEVICE_ICONS[item.deviceType as keyof typeof DEVICE_ICONS] || Monitor;
                    return (
                        <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <Icon className="w-4 h-4 text-muted-foreground" />
                                <span className="capitalize font-medium">{item.deviceType}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-muted-foreground">{item.count} sessions</span>
                                <span className="font-semibold">{item.percentage}%</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
