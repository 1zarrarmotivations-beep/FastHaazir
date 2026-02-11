/**
 * Analytics Dashboard - Main Component
 * Comprehensive analytics with charts, metrics, and real-time data
 * Created: February 3, 2026
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    BarChart3,
    TrendingUp,
    Users,
    Eye,
    Clock,
    MousePointerClick,
    Smartphone,
    Globe,
    AlertCircle,
    Download,
    Calendar,
    Activity
} from 'lucide-react';
import {
    useAnalyticsOverview,
    useTrafficSources,
    useTopPages,
    useDeviceStats,
    useBrowserStats,
    useConversionStats,
    useVisitorTimeSeries,
    usePageViewTimeSeries,
    useActiveUsers,
    useErrorStats,
    useUserGrowth,
    getDateRangePreset,
    type DateRange
} from '@/hooks/useAnalytics';
import { AnalyticsOverviewCards } from './AnalyticsOverviewCards';
import { VisitorChart } from './VisitorChart';
import { TrafficSourcesChart } from './TrafficSourcesChart';
import { TopPagesTable } from './TopPagesTable';
import { DeviceBreakdownChart } from './DeviceBreakdownChart';
import { BrowserStatsChart } from './BrowserStatsChart';
import { ConversionsTable } from './ConversionsTable';
import { RealTimeUsers } from './RealTimeUsers';
import { ErrorsTable } from './ErrorsTable';
import { UserGrowthChart } from './UserGrowthChart';
import { format } from 'date-fns';

type DatePreset = 'today' | '7days' | '30days' | '90days' | 'custom';

export default function AnalyticsDashboard() {
    const [datePreset, setDatePreset] = useState<DatePreset>('30days');
    const [dateRange, setDateRange] = useState<DateRange>(getDateRangePreset('30days'));

    // Fetch all analytics data
    const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview(dateRange);
    const { data: trafficSources } = useTrafficSources(dateRange);
    const { data: topPages } = useTopPages(dateRange, 10);
    const { data: deviceStats } = useDeviceStats(dateRange);
    const { data: browserStats } = useBrowserStats(dateRange);
    const { data: conversions } = useConversionStats(dateRange);
    const { data: visitorTimeSeries } = useVisitorTimeSeries(dateRange);
    const { data: pageViewTimeSeries } = usePageViewTimeSeries(dateRange);
    const { data: activeUsers } = useActiveUsers();
    const { data: errors } = useErrorStats(dateRange);
    const { data: userGrowth } = useUserGrowth(dateRange);

    const handleDatePresetChange = (preset: DatePreset) => {
        setDatePreset(preset);
        if (preset !== 'custom') {
            setDateRange(getDateRangePreset(preset));
        }
    };

    const handleExportData = async (format: 'csv' | 'excel' | 'pdf') => {
        // TODO: Implement export functionality
        console.log(`Exporting data as ${format}`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <BarChart3 className="w-8 h-8 text-primary" />
                        Analytics Dashboard
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Comprehensive insights into your application performance
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Date Range Selector */}
                    <Select value={datePreset} onValueChange={(value) => handleDatePresetChange(value as DatePreset)}>
                        <SelectTrigger className="w-[180px]">
                            <Calendar className="w-4 h-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="7days">Last 7 Days</SelectItem>
                            <SelectItem value="30days">Last 30 Days</SelectItem>
                            <SelectItem value="90days">Last 90 Days</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Export Button */}
                    <Select onValueChange={(value) => handleExportData(value as 'csv' | 'excel' | 'pdf')}>
                        <SelectTrigger className="w-[140px]">
                            <Download className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Export" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="csv">Export CSV</SelectItem>
                            <SelectItem value="excel">Export Excel</SelectItem>
                            <SelectItem value="pdf">Export PDF</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Date Range Display */}
            <div className="text-sm text-muted-foreground">
                Showing data from <span className="font-semibold">{format(dateRange.start, 'MMM dd, yyyy')}</span> to{' '}
                <span className="font-semibold">{format(dateRange.end, 'MMM dd, yyyy')}</span>
            </div>

            {/* Overview Cards */}
            <AnalyticsOverviewCards overview={overview} isLoading={overviewLoading} />

            {/* Main Analytics Tabs */}
            <Tabs defaultValue="traffic" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-2">
                    <TabsTrigger value="traffic" className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        <span className="hidden sm:inline">Traffic</span>
                    </TabsTrigger>
                    <TabsTrigger value="behavior" className="flex items-center gap-2">
                        <MousePointerClick className="w-4 h-4" />
                        <span className="hidden sm:inline">Behavior</span>
                    </TabsTrigger>
                    <TabsTrigger value="devices" className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        <span className="hidden sm:inline">Devices</span>
                    </TabsTrigger>
                    <TabsTrigger value="conversions" className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span className="hidden sm:inline">Conversions</span>
                    </TabsTrigger>
                    <TabsTrigger value="realtime" className="flex items-center gap-2">
                        <Activity className="w-4 h-4 animate-pulse text-green-500" />
                        <span className="hidden sm:inline">Real-Time</span>
                    </TabsTrigger>
                </TabsList>

                {/* Traffic & User Analytics Tab */}
                <TabsContent value="traffic" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Visitor Trend Chart */}
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Eye className="w-5 h-5 text-primary" />
                                    Visitor Trends
                                </CardTitle>
                                <CardDescription>
                                    Daily visitors and page views over time
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <VisitorChart
                                    visitorData={visitorTimeSeries || []}
                                    pageViewData={pageViewTimeSeries || []}
                                />
                            </CardContent>
                        </Card>

                        {/* Traffic Sources */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-primary" />
                                    Traffic Sources
                                </CardTitle>
                                <CardDescription>
                                    Where your visitors are coming from
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <TrafficSourcesChart data={trafficSources || []} />
                            </CardContent>
                        </Card>

                        {/* User Growth */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-primary" />
                                    User Growth
                                </CardTitle>
                                <CardDescription>
                                    New user registrations over time
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <UserGrowthChart data={userGrowth || []} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* User Behavior Tab */}
                <TabsContent value="behavior" className="space-y-6">
                    <div className="grid gap-6">
                        {/* Top Pages */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Eye className="w-5 h-5 text-primary" />
                                    Most Visited Pages
                                </CardTitle>
                                <CardDescription>
                                    Pages with the highest traffic and engagement
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <TopPagesTable data={topPages || []} />
                            </CardContent>
                        </Card>

                        {/* Session Duration & Bounce Rate */}
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-primary" />
                                        Average Session Duration
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-bold text-foreground">
                                        {overview ? `${Math.floor(overview.avgSessionDuration / 60)}m ${overview.avgSessionDuration % 60}s` : '0m 0s'}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Time users spend on your site
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MousePointerClick className="w-5 h-5 text-primary" />
                                        Bounce Rate
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-bold text-foreground">
                                        {overview ? `${overview.bounceRate}%` : '0%'}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Visitors who leave after one page
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* Devices & Browsers Tab */}
                <TabsContent value="devices" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Device Breakdown */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Smartphone className="w-5 h-5 text-primary" />
                                    Device Types
                                </CardTitle>
                                <CardDescription>
                                    Mobile, tablet, and desktop usage
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <DeviceBreakdownChart data={deviceStats || []} />
                            </CardContent>
                        </Card>

                        {/* Browser Stats */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-primary" />
                                    Browser Distribution
                                </CardTitle>
                                <CardDescription>
                                    Most popular browsers among users
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <BrowserStatsChart data={browserStats || []} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Conversions Tab */}
                <TabsContent value="conversions" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                Conversion Tracking
                            </CardTitle>
                            <CardDescription>
                                User actions and goal completions
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ConversionsTable data={conversions || []} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Real-Time Tab */}
                <TabsContent value="realtime" className="space-y-6">
                    <div className="grid gap-6">
                        {/* Active Users */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-green-500 animate-pulse" />
                                    Active Users Right Now
                                </CardTitle>
                                <CardDescription>
                                    Users currently browsing your application
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <RealTimeUsers data={activeUsers || []} />
                            </CardContent>
                        </Card>

                        {/* Recent Errors */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-destructive" />
                                    Recent Errors
                                </CardTitle>
                                <CardDescription>
                                    Latest application errors and exceptions
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ErrorsTable data={errors || []} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
