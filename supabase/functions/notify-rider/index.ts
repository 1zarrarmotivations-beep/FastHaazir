import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!;
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!;

interface NotifyRiderRequest {
  rider_id: string;
  order_id?: string;
  rider_request_id?: string;
  notification_type: 'new_order' | 'order_update' | 'urgent';
  custom_title?: string;
  custom_body?: string;
  pickup_address?: string;
  dropoff_address?: string;
  order_total?: number;
}

interface OneSignalNotification {
  app_id: string;
  include_player_ids?: string[];
  include_external_user_ids?: string[];
  headings: { en: string };
  contents: { en: string };
  data?: Record<string, unknown>;
  android_channel_id?: string;
  priority?: number;
  android_visibility?: number;
  android_sound?: string;
  ios_sound?: string;
  ios_interruption_level?: string;
  android_accent_color?: string;
  small_icon?: string;
  large_icon?: string;
  android_led_color?: string;
  android_vibration_pattern?: string;
  ttl?: number;
}

const notificationTemplates = {
  new_order: {
    title: '🚀 New Delivery Request!',
    body: (data: NotifyRiderRequest) => {
      let message = 'You have received a new delivery order';
      if (data.pickup_address) {
        message += ` from ${data.pickup_address}`;
      }
      if (data.order_total) {
        message += ` - Rs ${data.order_total}`;
      }
      return message;
    },
  },
  order_update: {
    title: '📦 Order Update',
    body: () => 'There has been an update to your assigned order',
  },
  urgent: {
    title: '🔴 URGENT: New Order!',
    body: (data: NotifyRiderRequest) => {
      return `Immediate pickup required${data.pickup_address ? ` at ${data.pickup_address}` : ''}!`;
    },
  },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: NotifyRiderRequest = await req.json();
    const { 
      rider_id, 
      order_id, 
      rider_request_id,
      notification_type = 'new_order',
      custom_title,
      custom_body,
      pickup_address,
      dropoff_address,
      order_total
    } = requestData;

    console.log('=== RIDER NOTIFICATION DEBUG ===');
    console.log('Request data:', JSON.stringify(requestData, null, 2));

    if (!rider_id) {
      throw new Error('rider_id is required');
    }

    // Check OneSignal configuration
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.error('OneSignal not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Push notifications not configured',
          details: 'OneSignal API credentials missing'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get rider's user_id from riders table
    const { data: rider, error: riderError } = await supabase
      .from('riders')
      .select('id, user_id, name, phone')
      .eq('id', rider_id)
      .single();

    if (riderError || !rider) {
      console.error('Rider not found:', riderError);
      throw new Error(`Rider not found: ${rider_id}`);
    }

    console.log('Found rider:', rider);

    if (!rider.user_id) {
      console.warn('Rider has no linked user_id');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Rider has no linked user account',
          rider_id: rider_id
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get device tokens for this rider
    const { data: deviceTokens, error: tokenError } = await supabase
      .from('push_device_tokens')
      .select('device_token, platform')
      .eq('user_id', rider.user_id);

    if (tokenError) {
      console.error('Error fetching device tokens:', tokenError);
    }

    console.log('Device tokens for rider:', {
      user_id: rider.user_id,
      token_count: deviceTokens?.length || 0,
      tokens: deviceTokens?.map(t => ({ 
        platform: t.platform, 
        token_preview: t.device_token.substring(0, 20) + '...' 
      }))
    });

    if (!deviceTokens || deviceTokens.length === 0) {
      console.warn('No device tokens found for rider');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No registered devices for this rider',
          rider_id: rider_id,
          user_id: rider.user_id,
          suggestion: 'Rider needs to open the app and enable push notifications'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get notification content
    const template = notificationTemplates[notification_type] || notificationTemplates.new_order;
    const title = custom_title || template.title;
    const body = custom_body || template.body({ 
      rider_id, 
      order_id, 
      rider_request_id,
      notification_type,
      pickup_address,
      dropoff_address,
      order_total
    });

    // Build OneSignal payload with HIGH PRIORITY for Android
    const playerIds = deviceTokens.map(t => t.device_token);
    
    const oneSignalPayload: OneSignalNotification = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { en: title },
      contents: { en: body },
      
      // CRITICAL: Android high-priority settings for background/locked sound
      priority: 10, // Highest priority (0-10)
      android_visibility: 1, // Public - show on lock screen
      android_sound: 'default', // Play default notification sound
      ios_sound: 'default',
      ios_interruption_level: 'time_sensitive', // iOS 15+ time-sensitive
      
      // Android specific settings for wake and sound
      android_accent_color: 'FF00FF00', // Green accent
      android_led_color: 'FF00FF00', // Green LED
      android_vibration_pattern: '0,500,500,500', // Vibration pattern
      
      // TTL - keep notification for 1 hour
      ttl: 3600,
      
      // Data payload for app routing
      data: {
        type: notification_type,
        order_id: order_id || null,
        rider_request_id: rider_request_id || null,
        rider_id: rider_id,
        route: order_id ? `/orders/${order_id}` : `/rider-requests/${rider_request_id}`,
        timestamp: new Date().toISOString(),
      },
    };

    console.log('OneSignal payload:', JSON.stringify(oneSignalPayload, null, 2));

    // Send to OneSignal
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(oneSignalPayload),
    });

    const result = await response.json();
    console.log('OneSignal response:', JSON.stringify(result, null, 2));

    let successCount = 0;
    let failureCount = 0;

    if (result.id) {
      successCount = result.recipients || playerIds.length;
      console.log(`Successfully queued notification to ${successCount} devices`);
    } else {
      failureCount = playerIds.length;
      console.error('OneSignal error:', result.errors);
    }

    // Log the push notification in database
    await supabase.from('push_notifications').insert({
      title,
      message: body,
      target_role: 'rider',
      target_user_id: rider.user_id,
      action_route: order_id ? `/orders/${order_id}` : `/rider-requests/${rider_request_id}`,
      sent_by: 'system',
      success_count: successCount,
      failure_count: failureCount,
    });

    // Also create an in-app notification for the rider
    await supabase.from('notifications').insert({
      user_id: rider.user_id,
      title,
      message: body,
      type: 'delivery',
      order_id: order_id || null,
      rider_request_id: rider_request_id || null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: result.id || null,
        recipients: successCount,
        failed: failureCount,
        rider: {
          id: rider_id,
          name: rider.name,
          user_id: rider.user_id,
        },
        message: successCount > 0 
          ? `Push notification sent to ${successCount} device(s)` 
          : 'Notification queued but delivery pending',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Rider notification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
