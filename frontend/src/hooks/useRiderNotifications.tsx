import { supabase } from "@/integrations/supabase/client";

interface NotifyRiderParams {
  rider_id: string;
  order_id?: string;
  rider_request_id?: string;
  notification_type?: 'new_order' | 'order_update' | 'urgent';
  custom_title?: string;
  custom_body?: string;
  pickup_address?: string;
  dropoff_address?: string;
  order_total?: number;
}

interface NotifyRiderResult {
  success: boolean;
  notification_id?: string;
  recipients?: number;
  failed?: number;
  error?: string;
  message?: string;
}

/**
 * Send a push notification to a specific rider
 * Uses OneSignal with high-priority Android settings for background/locked screen sound
 */
export const notifyRider = async (params: NotifyRiderParams): Promise<NotifyRiderResult> => {
  try {
    console.log('[notifyRider] Sending notification to rider:', params.rider_id);
    
    const { data, error } = await supabase.functions.invoke('notify-rider', {
      body: params,
    });

    if (error) {
      console.error('[notifyRider] Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send notification',
      };
    }

    console.log('[notifyRider] Result:', data);
    return data as NotifyRiderResult;
  } catch (err) {
    console.error('[notifyRider] Exception:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
};

/**
 * Send notifications to all online riders about a new available order
 */
export const notifyAllOnlineRiders = async (params: {
  order_id?: string;
  rider_request_id?: string;
  pickup_address?: string;
  dropoff_address?: string;
  order_total?: number;
}): Promise<{ sent: number; failed: number; errors: string[] }> => {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // Get all online riders
    const { data: onlineRiders, error } = await supabase
      .rpc('get_online_riders');

    if (error || !onlineRiders || onlineRiders.length === 0) {
      console.log('[notifyAllOnlineRiders] No online riders found');
      return results;
    }

    console.log(`[notifyAllOnlineRiders] Found ${onlineRiders.length} online riders`);

    // Send notification to each rider
    const promises = onlineRiders.map(async (rider) => {
      const result = await notifyRider({
        rider_id: rider.id,
        order_id: params.order_id,
        rider_request_id: params.rider_request_id,
        notification_type: 'new_order',
        pickup_address: params.pickup_address,
        dropoff_address: params.dropoff_address,
        order_total: params.order_total,
      });

      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        if (result.error) {
          results.errors.push(`${rider.name}: ${result.error}`);
        }
      }
    });

    await Promise.all(promises);
    
    console.log('[notifyAllOnlineRiders] Results:', results);
    return results;
  } catch (err) {
    console.error('[notifyAllOnlineRiders] Exception:', err);
    results.errors.push(err instanceof Error ? err.message : 'Unknown error');
    return results;
  }
};

/**
 * Hook for rider notification utilities
 */
export const useRiderNotifications = () => {
  return {
    notifyRider,
    notifyAllOnlineRiders,
  };
};

export default useRiderNotifications;
