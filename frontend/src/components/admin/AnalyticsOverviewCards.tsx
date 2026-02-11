/**
 * Analytics Overview Cards
 * Key metrics cards for the analytics dashboard
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Eye, Clock, MousePointerClick, TrendingUp, Activity } from 'lucide-react';
import type { AnalyticsOverview } from '@/hooks/useAnalytics';

interface Props {
    overview?: AnalyticsOverview;
    isLoading: boolean;
}

export function AnalyticsOverviewCards({ overview, isLoading }: Props) {
    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {[...Array(6)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="pb-2">
                            <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-16" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const cards = [
        {
            title: 'Total Visitors',
            value: overview?.totalVisitors.toLocaleString() || '0',
            icon: Users,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10'
        },
        {
            title: 'Page Views',
            value: overview?.totalPageViews.toLocaleString() || '0',
            icon: Eye,
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/10'
        },
        {
            title: 'Unique Visitors',
            value: overview?.uniqueVisitors.toLocaleString() || '0',
            icon: TrendingUp,
            color: 'text-green-500',
            bgColor: 'bg-green-500/10'
        },
        {
            title: 'Avg. Session',
            value: overview ? `${Math.floor(overview.avgSessionDuration / 60)}m ${overview.avgSessionDuration % 60}s` : '0m',
            icon: Clock,
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10'
        },
        {
            title: 'Bounce Rate',
            value: overview ? `${overview.bounceRate}%` : '0%',
            icon: MousePointerClick,
            color: 'text-red-500',
            bgColor: 'bg-red-500/10'
        },
        {
            title: 'Active Now',
            value: overview?.activeUsers.toLocaleString() || '0',
            icon: Activity,
            color: 'text-emerald-500 animate-pulse',
            bgColor: 'bg-emerald-500/10'
        }
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {cards.map((card, index) => {
                const Icon = card.icon;
                return (
                    <Card key={index} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {card.title}
                            </CardTitle>
                            <div className={`p-2 rounded-lg ${card.bgColor}`}>
                                <Icon className={`w-4 h-4 ${card.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{card.value}</div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
