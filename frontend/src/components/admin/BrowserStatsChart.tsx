/**
 * Browser Stats Chart
 * Horizontal bar chart for browser distribution
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { BrowserStats } from '@/hooks/useAnalytics';

interface Props {
    data: BrowserStats[];
}

export function BrowserStatsChart({ data }: Props) {
    if (data.length === 0) {
        return (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No browser data available
            </div>
        );
    }

    // Take top 5 browsers
    const topBrowsers = data.slice(0, 5);

    return (
        <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topBrowsers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                    type="number"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                    dataKey="browser"
                    type="category"
                    width={80}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                    }}
                />
                <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[0, 8, 8, 0]}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
