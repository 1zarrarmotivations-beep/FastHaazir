/**
 * Analytics Data Hooks
 * React hooks for fetching analytics data
 * Created: February 3, 2026
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

export interface DateRange {
    start: Date;
    end: Date;
}

export interface AnalyticsOverview {
    totalVisitors: number;
    totalPageViews: number;
    uniqueVisitors: number;
    avgSessionDuration: number;
    bounceRate: number;
    activeUsers: number;
}

export interface TrafficSource {
    source: string;
    sessions: number;
    percentage: number;
}

export interface TopPage {
    path: string;
    views: number;
    uniqueVisitors: number;
    avgDuration: number;
}

export interface DeviceStats {
    deviceType: string;
    count: number;
    percentage: number;
}

export interface BrowserStats {
    browser: string;
    count: number;
    percentage: number;
}

export interface ConversionStats {
    type: string;
    count: number;
    value: number;
}

export interface TimeSeriesData {
    date: string;
    value: number;
}

// ============================================================================
// ANALYTICS OVERVIEW
// ============================================================================

export const useAnalyticsOverview = (dateRange: DateRange) => {
    return useQuery({
        queryKey: ['analytics', 'overview', dateRange],
        queryFn: async () => {
            const { start, end } = dateRange;

            // Get total sessions
            const { count: totalSessions } = await (supabase as any)
                .from('analytics_sessions')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', start.toISOString())
                .lte('created_at', end.toISOString());

            // Get total page views
            const { count: totalPageViews } = await (supabase as any)
                .from('analytics_page_views')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', start.toISOString())
                .lte('created_at', end.toISOString());

            // Get unique visitors
            const { data: uniqueVisitorsData } = await (supabase as any)
                .from('analytics_sessions')
                .select('user_id')
                .gte('created_at', start.toISOString())
                .lte('created_at', end.toISOString())
                .not('user_id', 'is', null);

            const uniqueVisitors = new Set(uniqueVisitorsData?.map((s: any) => s.user_id)).size;

            // Get average session duration
            const { data: durationData } = await (supabase as any)
                .from('analytics_sessions')
                .select('total_duration_seconds')
                .gte('created_at', start.toISOString())
                .lte('created_at', end.toISOString());

            const avgSessionDuration = durationData && durationData.length > 0
                ? durationData.reduce((sum: number, s: any) => sum + (s.total_duration_seconds || 0), 0) / durationData.length
                : 0;

            // Get bounce rate
            const { data: bounceData } = await (supabase as any).rpc('calculate_bounce_rate', {
                start_date: start.toISOString(),
                end_date: end.toISOString()
            });

            // Get active users (last 5 minutes)
            const { count: activeUsers } = await (supabase as any)
                .from('analytics_active_users')
                .select('*', { count: 'exact', head: true })
                .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString());

            return {
                totalVisitors: totalSessions || 0,
                totalPageViews: totalPageViews || 0,
                uniqueVisitors,
                avgSessionDuration: Math.round(avgSessionDuration),
                bounceRate: bounceData || 0,
                activeUsers: activeUsers || 0
            } as AnalyticsOverview;
        },
        refetchInterval: 30000 // Refetch every 30 seconds
    });
};

// ============================================================================
// TRAFFIC SOURCES
// ============================================================================

export const useTrafficSources = (dateRange: DateRange) => {
    return useQuery({
        queryKey: ['analytics', 'traffic-sources', dateRange],
        queryFn: async () => {
            const { data, error } = await (supabase as any).rpc('get_traffic_sources', {
                start_date: dateRange.start.toISOString(),
                end_date: dateRange.end.toISOString()
            });

            if (error) throw error;

            return (data || []).map((item: any) => ({
                source: item.traffic_source,
                sessions: item.session_count,
                percentage: item.percentage
            })) as TrafficSource[];
        }
    });
};

// ============================================================================
// TOP PAGES
// ============================================================================

export const useTopPages = (dateRange: DateRange, limit: number = 10) => {
    return useQuery({
        queryKey: ['analytics', 'top-pages', dateRange, limit],
        queryFn: async () => {
            const { data, error } = await (supabase as any).rpc('get_top_pages', {
                limit_count: limit,
                start_date: dateRange.start.toISOString(),
                end_date: dateRange.end.toISOString()
            });

            if (error) throw error;

            return (data || []).map((item: any) => ({
                path: item.page_path,
                views: item.view_count,
                uniqueVisitors: item.unique_visitors,
                avgDuration: item.avg_duration
            })) as TopPage[];
        }
    });
};

// ============================================================================
// DEVICE ANALYTICS
// ============================================================================

export const useDeviceStats = (dateRange: DateRange) => {
    return useQuery({
        queryKey: ['analytics', 'devices', dateRange],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('analytics_sessions')
                .select('device_type')
                .gte('created_at', dateRange.start.toISOString())
                .lte('created_at', dateRange.end.toISOString());

            if (error) throw error;

            const total = data?.length || 0;
            const counts: Record<string, number> = {};

            data?.forEach((item: any) => {
                const device = item.device_type || 'unknown';
                counts[device] = (counts[device] || 0) + 1;
            });

            return Object.entries(counts).map(([deviceType, count]) => ({
                deviceType,
                count,
                percentage: total > 0 ? Math.round((count / total) * 100) : 0
            })) as DeviceStats[];
        }
    });
};

// ============================================================================
// BROWSER ANALYTICS
// ============================================================================

export const useBrowserStats = (dateRange: DateRange) => {
    return useQuery({
        queryKey: ['analytics', 'browsers', dateRange],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('analytics_sessions')
                .select('browser')
                .gte('created_at', dateRange.start.toISOString())
                .lte('created_at', dateRange.end.toISOString());

            if (error) throw error;

            const total = data?.length || 0;
            const counts: Record<string, number> = {};

            data?.forEach((item: any) => {
                const browser = item.browser || 'Unknown';
                counts[browser] = (counts[browser] || 0) + 1;
            });

            return Object.entries(counts)
                .map(([browser, count]) => ({
                    browser,
                    count,
                    percentage: total > 0 ? Math.round((count / total) * 100) : 0
                }))
                .sort((a, b) => b.count - a.count) as BrowserStats[];
        }
    });
};

// ============================================================================
// CONVERSION ANALYTICS
// ============================================================================

export const useConversionStats = (dateRange: DateRange) => {
    return useQuery({
        queryKey: ['analytics', 'conversions', dateRange],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('analytics_conversions')
                .select('conversion_type, conversion_value')
                .gte('created_at', dateRange.start.toISOString())
                .lte('created_at', dateRange.end.toISOString());

            if (error) throw error;

            const stats: Record<string, { count: number; value: number }> = {};

            data?.forEach((item: any) => {
                const type = item.conversion_type;
                if (!stats[type]) {
                    stats[type] = { count: 0, value: 0 };
                }
                stats[type].count++;
                stats[type].value += item.conversion_value || 0;
            });

            return Object.entries(stats).map(([type, { count, value }]) => ({
                type,
                count,
                value
            })) as ConversionStats[];
        }
    });
};

// ============================================================================
// TIME SERIES DATA
// ============================================================================

export const useVisitorTimeSeries = (dateRange: DateRange) => {
    return useQuery({
        queryKey: ['analytics', 'time-series-visitors', dateRange],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('analytics_sessions')
                .select('created_at')
                .gte('created_at', dateRange.start.toISOString())
                .lte('created_at', dateRange.end.toISOString())
                .order('created_at');

            if (error) throw error;

            // Group by date
            const grouped: Record<string, number> = {};
            data?.forEach((item: any) => {
                const date = format(new Date(item.created_at), 'yyyy-MM-dd');
                grouped[date] = (grouped[date] || 0) + 1;
            });

            return Object.entries(grouped)
                .map(([date, value]) => ({ date, value }))
                .sort((a, b) => a.date.localeCompare(b.date)) as TimeSeriesData[];
        }
    });
};

export const usePageViewTimeSeries = (dateRange: DateRange) => {
    return useQuery({
        queryKey: ['analytics', 'time-series-pageviews', dateRange],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('analytics_page_views')
                .select('created_at')
                .gte('created_at', dateRange.start.toISOString())
                .lte('created_at', dateRange.end.toISOString())
                .order('created_at');

            if (error) throw error;

            // Group by date
            const grouped: Record<string, number> = {};
            data?.forEach((item: any) => {
                const date = format(new Date(item.created_at), 'yyyy-MM-dd');
                grouped[date] = (grouped[date] || 0) + 1;
            });

            return Object.entries(grouped)
                .map(([date, value]) => ({ date, value }))
                .sort((a, b) => a.date.localeCompare(b.date)) as TimeSeriesData[];
        }
    });
};

// ============================================================================
// REAL-TIME ACTIVE USERS
// ============================================================================

export const useActiveUsers = () => {
    return useQuery({
        queryKey: ['analytics', 'active-users'],
        queryFn: async () => {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

            const { data, error } = await (supabase as any)
                .from('analytics_active_users')
                .select('user_id, current_page, last_seen')
                .gte('last_seen', fiveMinutesAgo.toISOString())
                .order('last_seen', { ascending: false });

            if (error) throw error;

            return data || [];
        },
        refetchInterval: 10000 // Refetch every 10 seconds for real-time data
    });
};

// ============================================================================
// ERROR ANALYTICS
// ============================================================================

export const useErrorStats = (dateRange: DateRange) => {
    return useQuery({
        queryKey: ['analytics', 'errors', dateRange],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('analytics_errors')
                .select('error_type, error_message, created_at, page_path')
                .gte('created_at', dateRange.start.toISOString())
                .lte('created_at', dateRange.end.toISOString())
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            return data || [];
        }
    });
};

// ============================================================================
// USER GROWTH
// ============================================================================

export const useUserGrowth = (dateRange: DateRange) => {
    return useQuery({
        queryKey: ['analytics', 'user-growth', dateRange],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('customer_profiles')
                .select('created_at')
                .gte('created_at', dateRange.start.toISOString())
                .lte('created_at', dateRange.end.toISOString())
                .order('created_at');

            if (error) throw error;

            // Group by date
            const grouped: Record<string, number> = {};
            data?.forEach((item: any) => {
                const date = format(new Date(item.created_at), 'yyyy-MM-dd');
                grouped[date] = (grouped[date] || 0) + 1;
            });

            return Object.entries(grouped)
                .map(([date, value]) => ({ date, value }))
                .sort((a, b) => a.date.localeCompare(b.date)) as TimeSeriesData[];
        }
    });
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getDateRangePreset = (preset: 'today' | '7days' | '30days' | '90days'): DateRange => {
    const end = endOfDay(new Date());
    let start: Date;

    switch (preset) {
        case 'today':
            start = startOfDay(new Date());
            break;
        case '7days':
            start = startOfDay(subDays(new Date(), 7));
            break;
        case '30days':
            start = startOfDay(subDays(new Date(), 30));
            break;
        case '90days':
            start = startOfDay(subDays(new Date(), 90));
            break;
        default:
            start = startOfDay(subDays(new Date(), 30));
    }

    return { start, end };
};
