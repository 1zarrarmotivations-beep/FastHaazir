/**
 * Analytics Tracking Library
 * Automatically tracks user interactions, page views, and system events
 * Created: February 3, 2026
 */

import { supabase } from '@/integrations/supabase/client';

// Generate a random UUID using the native crypto API
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// ============================================================================
// TYPES
// ============================================================================

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type TrafficSource = 'direct' | 'social' | 'search' | 'referral' | 'email' | 'other';
export type EventCategory = 'page_view' | 'click' | 'form' | 'order' | 'auth' | 'search' | 'error' | 'custom';
export type ConversionType = 'signup' | 'order_placed' | 'order_completed' | 'rider_signup' | 'business_created';

export interface AnalyticsSession {
    id: string;
    userId?: string;
    deviceType: DeviceType;
    browser: string;
    os: string;
    country?: string;
    city?: string;
    ipAddress?: string;
    trafficSource: TrafficSource;
    referrerUrl?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
}

export interface PageViewData {
    pagePath: string;
    pageTitle: string;
    referrer?: string;
    duration?: number;
}

export interface EventData {
    eventName: string;
    eventCategory: EventCategory;
    eventLabel?: string;
    eventValue?: number;
    metadata?: Record<string, any>;
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

class AnalyticsManager {
    private sessionId: string | null = null;
    private sessionStartTime: number = Date.now();
    private currentPageStartTime: number = Date.now();
    private currentPagePath: string = '';
    private heartbeatInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.initializeSession();
        this.startHeartbeat();
        this.setupPageTracking();
        this.setupErrorTracking();
    }

    /**
     * Initialize or restore analytics session
     */
    private async initializeSession() {
        // Check for existing session in sessionStorage
        const existingSessionId = sessionStorage.getItem('analytics_session_id');
        const sessionExpiry = sessionStorage.getItem('analytics_session_expiry');

        if (existingSessionId && sessionExpiry && Date.now() < parseInt(sessionExpiry)) {
            this.sessionId = existingSessionId;
            await this.updateActiveUser();
        } else {
            await this.createNewSession();
        }
    }

    /**
     * Create a new analytics session
     */
    private async createNewSession() {
        this.sessionId = generateUUID();
        const deviceInfo = this.getDeviceInfo();
        const trafficInfo = this.getTrafficInfo();

        // Store session ID with 30-minute expiry
        sessionStorage.setItem('analytics_session_id', this.sessionId);
        sessionStorage.setItem('analytics_session_expiry', (Date.now() + 30 * 60 * 1000).toString());

        try {
            const { data: { user } } = await supabase.auth.getUser();

            await (supabase as any).from('analytics_sessions').insert({
                id: this.sessionId,
                user_id: user?.id,
                device_type: deviceInfo.deviceType,
                browser: deviceInfo.browser,
                os: deviceInfo.os,
                entry_page: window.location.pathname,
                traffic_source: trafficInfo.source,
                referrer_url: trafficInfo.referrer,
                utm_source: trafficInfo.utmSource,
                utm_medium: trafficInfo.utmMedium,
                utm_campaign: trafficInfo.utmCampaign,
                is_active: true
            });

            await this.updateActiveUser();
        } catch (error) {
            console.error('Failed to create analytics session:', error);
        }
    }

    /**
     * Update active user status
     */
    private async updateActiveUser() {
        if (!this.sessionId) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await (supabase as any).from('analytics_active_users').upsert({
                user_id: user.id,
                session_id: this.sessionId,
                last_seen: new Date().toISOString(),
                current_page: window.location.pathname
            }, {
                onConflict: 'user_id,session_id'
            });
        } catch (error) {
            console.error('Failed to update active user:', error);
        }
    }

    /**
     * Start heartbeat to keep session alive
     */
    private startHeartbeat() {
        // Update active status every 30 seconds
        this.heartbeatInterval = setInterval(() => {
            this.updateActiveUser();
        }, 30000);
    }

    /**
     * Setup automatic page tracking
     */
    private setupPageTracking() {
        // Track initial page view
        this.trackPageView({
            pagePath: window.location.pathname,
            pageTitle: document.title,
            referrer: document.referrer
        });

        // Track page changes (for SPAs)
        let lastPath = window.location.pathname;
        const observer = new MutationObserver(() => {
            const currentPath = window.location.pathname;
            if (currentPath !== lastPath) {
                // Save duration of previous page
                this.savePreviousPageDuration();

                // Track new page
                this.trackPageView({
                    pagePath: currentPath,
                    pageTitle: document.title
                });

                lastPath = currentPath;
                this.currentPageStartTime = Date.now();
            }
        });

        observer.observe(document.querySelector('title') || document.head, {
            childList: true,
            subtree: true
        });

        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.savePreviousPageDuration();
            } else {
                this.currentPageStartTime = Date.now();
            }
        });

        // Track before unload
        window.addEventListener('beforeunload', () => {
            this.savePreviousPageDuration();
            this.endSession();
        });
    }

    /**
     * Setup automatic error tracking
     */
    private setupErrorTracking() {
        window.addEventListener('error', (event) => {
            this.trackError({
                errorType: 'javascript_error',
                errorMessage: event.message,
                errorStack: event.error?.stack,
                pagePath: window.location.pathname
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.trackError({
                errorType: 'unhandled_promise_rejection',
                errorMessage: event.reason?.message || String(event.reason),
                errorStack: event.reason?.stack,
                pagePath: window.location.pathname
            });
        });
    }

    /**
     * Save duration of previous page view
     */
    private async savePreviousPageDuration() {
        if (!this.currentPagePath) return;

        const duration = Math.floor((Date.now() - this.currentPageStartTime) / 1000);

        try {
            // Update the most recent page view for this session and path
            await (supabase as any)
                .from('analytics_page_views')
                .update({ duration_seconds: duration })
                .eq('session_id', this.sessionId)
                .eq('page_path', this.currentPagePath)
                .order('created_at', { ascending: false })
                .limit(1);

            // Update session total duration
            await (supabase as any).rpc('increment_session_duration', {
                p_session_id: this.sessionId,
                p_duration: duration
            });
        } catch (error) {
            console.error('Failed to save page duration:', error);
        }
    }

    /**
     * Track page view
     */
    async trackPageView(data: PageViewData) {
        if (!this.sessionId) return;

        this.currentPagePath = data.pagePath;
        this.currentPageStartTime = Date.now();

        const deviceInfo = this.getDeviceInfo();

        try {
            const { data: { user } } = await supabase.auth.getUser();

            await (supabase as any).from('analytics_page_views').insert({
                session_id: this.sessionId,
                user_id: user?.id,
                page_path: data.pagePath,
                page_title: data.pageTitle,
                referrer: data.referrer,
                user_agent: navigator.userAgent,
                device_type: deviceInfo.deviceType,
                browser: deviceInfo.browser,
                os: deviceInfo.os,
                duration_seconds: 0
            });

            // Update session page count
            await (supabase as any)
                .from('analytics_sessions')
                .update({
                    total_pages_viewed: (supabase as any).rpc('increment'),
                    exit_page: data.pagePath
                })
                .eq('id', this.sessionId);

            // Update active user current page
            await this.updateActiveUser();
        } catch (error) {
            console.error('Failed to track page view:', error);
        }
    }

    /**
     * Track custom event
     */
    async trackEvent(data: EventData) {
        if (!this.sessionId) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();

            await (supabase as any).from('analytics_events').insert({
                session_id: this.sessionId,
                user_id: user?.id,
                event_name: data.eventName,
                event_category: data.eventCategory,
                event_label: data.eventLabel,
                event_value: data.eventValue,
                metadata: data.metadata || {},
                page_path: window.location.pathname
            });
        } catch (error) {
            console.error('Failed to track event:', error);
        }
    }

    /**
     * Track conversion
     */
    async trackConversion(type: ConversionType, value?: number, metadata?: Record<string, any>) {
        if (!this.sessionId) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();

            await (supabase as any).from('analytics_conversions').insert({
                session_id: this.sessionId,
                user_id: user?.id,
                conversion_type: type,
                conversion_value: value || 0,
                metadata: metadata || {}
            });
        } catch (error) {
            console.error('Failed to track conversion:', error);
        }
    }

    /**
     * Track error
     */
    async trackError(data: {
        errorType: string;
        errorMessage: string;
        errorStack?: string;
        pagePath?: string;
        metadata?: Record<string, any>;
    }) {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            await (supabase as any).from('analytics_errors').insert({
                session_id: this.sessionId,
                user_id: user?.id,
                error_type: data.errorType,
                error_message: data.errorMessage,
                error_stack: data.errorStack,
                page_path: data.pagePath || window.location.pathname,
                user_agent: navigator.userAgent,
                metadata: data.metadata || {}
            });
        } catch (error) {
            console.error('Failed to track error:', error);
        }
    }

    /**
     * End current session
     */
    private async endSession() {
        if (!this.sessionId) return;

        try {
            await (supabase as any)
                .from('analytics_sessions')
                .update({
                    is_active: false,
                    session_end: new Date().toISOString()
                })
                .eq('id', this.sessionId);

            // Remove from active users
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await (supabase as any)
                    .from('analytics_active_users')
                    .delete()
                    .eq('session_id', this.sessionId);
            }
        } catch (error) {
            console.error('Failed to end session:', error);
        }

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
    }

    /**
     * Get device information
     */
    private getDeviceInfo(): { deviceType: DeviceType; browser: string; os: string } {
        const ua = navigator.userAgent;

        // Detect device type
        let deviceType: DeviceType = 'desktop';
        if (/Mobile|Android|iPhone/i.test(ua)) {
            deviceType = 'mobile';
        } else if (/Tablet|iPad/i.test(ua)) {
            deviceType = 'tablet';
        }

        // Detect browser
        let browser = 'Unknown';
        if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Safari')) browser = 'Safari';
        else if (ua.includes('Edge')) browser = 'Edge';
        else if (ua.includes('Opera')) browser = 'Opera';

        // Detect OS
        let os = 'Unknown';
        if (ua.includes('Windows')) os = 'Windows';
        else if (ua.includes('Mac')) os = 'macOS';
        else if (ua.includes('Linux')) os = 'Linux';
        else if (ua.includes('Android')) os = 'Android';
        else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

        return { deviceType, browser, os };
    }

    /**
     * Get traffic source information
     */
    private getTrafficInfo(): {
        source: TrafficSource;
        referrer?: string;
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
    } {
        const params = new URLSearchParams(window.location.search);
        const referrer = document.referrer;

        const utmSource = params.get('utm_source') || undefined;
        const utmMedium = params.get('utm_medium') || undefined;
        const utmCampaign = params.get('utm_campaign') || undefined;

        let source: TrafficSource = 'direct';

        if (utmSource) {
            if (utmMedium === 'email') source = 'email';
            else if (utmMedium === 'social') source = 'social';
            else source = 'other';
        } else if (referrer) {
            if (referrer.includes('google') || referrer.includes('bing') || referrer.includes('yahoo')) {
                source = 'search';
            } else if (referrer.includes('facebook') || referrer.includes('twitter') || referrer.includes('instagram')) {
                source = 'social';
            } else {
                source = 'referral';
            }
        }

        return {
            source,
            referrer: referrer || undefined,
            utmSource,
            utmMedium,
            utmCampaign
        };
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let analyticsInstance: AnalyticsManager | null = null;

export const initializeAnalytics = () => {
    if (!analyticsInstance && typeof window !== 'undefined') {
        analyticsInstance = new AnalyticsManager();
    }
    return analyticsInstance;
};

export const getAnalytics = () => {
    if (!analyticsInstance) {
        return initializeAnalytics();
    }
    return analyticsInstance;
};

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export const trackPageView = (data: PageViewData) => {
    getAnalytics()?.trackPageView(data);
};

export const trackEvent = (data: EventData) => {
    getAnalytics()?.trackEvent(data);
};

export const trackConversion = (type: ConversionType, value?: number, metadata?: Record<string, any>) => {
    getAnalytics()?.trackConversion(type, value, metadata);
};

export const trackClick = (elementName: string, metadata?: Record<string, any>) => {
    trackEvent({
        eventName: 'click',
        eventCategory: 'click',
        eventLabel: elementName,
        metadata
    });
};

export const trackFormSubmit = (formName: string, metadata?: Record<string, any>) => {
    trackEvent({
        eventName: 'form_submit',
        eventCategory: 'form',
        eventLabel: formName,
        metadata
    });
};

export const trackSearch = (searchTerm: string, resultCount?: number) => {
    trackEvent({
        eventName: 'search',
        eventCategory: 'search',
        eventLabel: searchTerm,
        eventValue: resultCount,
        metadata: { search_term: searchTerm, result_count: resultCount }
    });
};
