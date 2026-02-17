/**
 * Push Notification Utility
 * Handles welcome notifications and order notifications
 * Uses OneSignal for cross-platform push notifications
 */

/**
 * Send a local push notification (for welcome messages)
 * Uses browser Notification API as fallback
 */
export const sendLocalNotification = async (
    title: string,
    message: string,
    data?: Record<string, unknown>
): Promise<boolean> => {
    try {
        // Use browser notification as fallback
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification(title, {
                    body: message,
                    icon: '/icon-192.png',
                    tag: 'fasthaazir-notification'
                });
                console.log('[Notifications] Browser notification sent:', title);
                return true;
            } else if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    new Notification(title, {
                        body: message,
                        icon: '/icon-192.png',
                        tag: 'fasthaazir-notification'
                    });
                    return true;
                }
            }
        }

        // Try OneSignal if available (for native Android)
        const oneSignal = (window as unknown as { OneSignal?: { Notifications?: { displayNotification?: (params: unknown) => Promise<unknown> } } }).OneSignal;
        if (oneSignal?.Notifications?.displayNotification) {
            await oneSignal.Notifications.displayNotification({
                title,
                message,
                ...data,
            });
            console.log('[Notifications] OneSignal notification sent:', title);
            return true;
        }

        console.log('[Notifications] No notification method available');
        return false;
    } catch (error) {
        console.error('[Notifications] Error sending notification:', error);
        return false;
    }
};

/**
 * Send welcome notification after successful login
 */
export const sendWelcomeNotification = async (userName?: string): Promise<boolean> => {
    const title = '👋 Welcome to Fast Haazir!';
    const message = userName
        ? `Hello ${userName}! Welcome back to Fast Haazir.`
        : 'Welcome back! Start delivering or ordering now.';

    return sendLocalNotification(title, message, {
        route: '/',
        type: 'welcome',
    });
};

/**
 * Send new order notification for riders
 * This should be called when a new order is assigned to a rider
 */
export const sendNewOrderNotification = async (
    orderId: string,
    pickupLocation: string,
    amount: string
): Promise<boolean> => {
    const title = '🚴 New Order Available!';
    const message = `Order from ${pickupLocation} - Earn ${amount}`;

    return sendLocalNotification(title, message, {
        route: '/rider',
        orderId,
        type: 'new_order',
    });
};

/**
 * Check if notifications are supported
 */
export const isNotificationSupported = (): boolean => {
    return (
        typeof window !== 'undefined' &&
        'Notification' in window
    );
};

/**
 * Request notification permission
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
    try {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    } catch (error) {
        console.error('[Notifications] Error requesting permission:', error);
        return false;
    }
};

/**
 * Get current notification permission status
 */
export const getNotificationPermissionStatus = (): 'granted' | 'denied' | 'default' | 'unsupported' => {
    if (typeof window === 'undefined') return 'unsupported';

    if ('Notification' in window) {
        return Notification.permission as 'granted' | 'denied' | 'default';
    }

    return 'unsupported';
};
