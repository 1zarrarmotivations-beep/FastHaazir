/**
 * Visitor Chart Component
 * Line chart showing visitor and page view trends
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TimeSeriesData } from '@/hooks/useAnalytics';

interface Props {
    visitorData: TimeSeriesData[];
    pageViewData: TimeSeriesData[];
}

export function VisitorChart({ visitorData, pageViewData }: Props) {
    // Merge the two datasets
    const mergedData = visitorData.map(visitor => {
        const pageView = pageViewData.find(pv => pv.date === visitor.date);
        return {
            date: visitor.date,
            visitors: visitor.value,
            pageViews: pageView?.value || 0
        };
    });

    if (mergedData.length === 0) {
        return (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available for the selected period
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mergedData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                    }}
                />
                <Legend />
                <Line
                    type="monotone"
                    dataKey="visitors"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                    name="Visitors"
                />
                <Line
                    type="monotone"
                    dataKey="pageViews"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-2))' }}
                    name="Page Views"
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
