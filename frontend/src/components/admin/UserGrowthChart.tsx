/**
 * User Growth Chart
 * Area chart showing new user registrations over time
 */

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TimeSeriesData } from '@/hooks/useAnalytics';

interface Props {
    data: TimeSeriesData[];
}

export function UserGrowthChart({ data }: Props) {
    if (data.length === 0) {
        return (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No user growth data available
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                    dataKey="date"
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
                <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorGrowth)"
                    name="New Users"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
