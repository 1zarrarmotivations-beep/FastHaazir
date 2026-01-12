import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

type DeliveryEventType = 'rider_assigned' | 'on_way' | 'nearby' | 'delivered';

interface DeliveryPushRequest {
  customerId: string;
  eventType: DeliveryEventType;
  orderId?: string;
  riderRequestId?: string;
  riderName?: string;
}

const notificationTemplates: Record<DeliveryEventType, { title: string; message: (riderName?: string) => string }> = {
  rider_assigned: {
    title: '🏍️ Rider Assigned!',
    message: (riderName) => `${riderName || 'A rider'} has been assigned to your order.`,
  },
  on_way: {
    title: '🚀 Order On The Way!',
    message: () => 'Your rider has picked up the order and is heading to you.',
  },
  nearby: {
    title: '🏍️ Rider is nearby!',
    message: () => 'Your rider is less than 500m away. Get ready!',
  },
  delivered: {
    title: '✅ Order Delivered!',
    message: () => 'Your order has been delivered. Enjoy!',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authorization - caller must be authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { customerId, eventType, orderId, riderRequestId, riderName }: DeliveryPushRequest = await req.json();

    if (!customerId || !eventType) {
      throw new Error('Missing required fields: customerId, eventType');
    }

    // SECURITY: Verify caller is authorized to send notifications for this order/request
    let isAuthorized = false;

    if (orderId) {
      // Check if caller is the assigned rider or business owner for this order
      const { data: order } = await supabase
        .from('orders')
        .select('customer_id, rider_id, business_id, businesses(owner_user_id)')
        .eq('id', orderId)
        .single();

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.customer_id !== customerId) {
        throw new Error('Customer ID mismatch');
      }

      // Check if caller is the assigned rider
      const { data: rider } = await supabase
        .from('riders')
        .select('id')
        .eq('user_id', user.id)
        .eq('id', order.rider_id)
        .maybeSingle();

      // Check if caller is the business owner
      const isBusiness = (order.businesses as any)?.owner_user_id === user.id;

      // Check if caller is the customer themselves (for self-notifications)
      const isCustomer = order.customer_id === user.id;

      isAuthorized = !!rider || isBusiness || isCustomer;
    } else if (riderRequestId) {
      // Check if caller is the assigned rider for this request
      const { data: request } = await supabase
        .from('rider_requests')
        .select('customer_id, rider_id')
        .eq('id', riderRequestId)
        .single();

      if (!request) {
        throw new Error('Request not found');
      }

      if (request.customer_id !== customerId) {
        throw new Error('Customer ID mismatch');
      }

      // Check if caller is the assigned rider
      const { data: rider } = await supabase
        .from('riders')
        .select('id')
        .eq('user_id', user.id)
        .eq('id', request.rider_id)
        .maybeSingle();

      // Check if caller is the customer themselves
      const isCustomer = request.customer_id === user.id;

      isAuthorized = !!rider || isCustomer;
    } else {
      // Must have either orderId or riderRequestId
      throw new Error('Must provide orderId or riderRequestId');
    }

    if (!isAuthorized) {
      throw new Error('Not authorized to send notifications for this order');
    }

    const template = notificationTemplates[eventType];
    if (!template) {
      throw new Error(`Invalid event type: ${eventType}`);
    }

    const title = template.title;
    const message = template.message(riderName);

    console.log('Sending delivery push:', { customerId, eventType, orderId, riderRequestId });

    // Check if push is configured
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.log('OneSignal not configured, skipping push notification');
      return new Response(
        JSON.stringify({ 
          success: true, 
          pushed: false,
          reason: 'Push not configured',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get device tokens for the customer
    const { data: tokens } = await supabase
      .from('push_device_tokens')
      .select('device_token')
      .eq('user_id', customerId);

    const playerIds = tokens?.map(t => t.device_token) || [];

    if (playerIds.length === 0) {
      console.log('No device tokens found for customer');
      return new Response(
        JSON.stringify({ 
          success: true, 
          pushed: false,
          reason: 'No device tokens',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine action route
    const actionRoute = orderId 
      ? `/orders?highlight=${orderId}`
      : riderRequestId 
        ? `/orders?highlight=${riderRequestId}`
        : '/orders';

    // Send via OneSignal
    const oneSignalPayload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { en: title },
      contents: { en: message },
      data: { 
        route: actionRoute,
        eventType,
        orderId,
        riderRequestId,
      },
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(oneSignalPayload),
    });

    const result = await response.json();
    console.log('OneSignal response:', result);

    const success = !!result.id;
    const recipientCount = result.recipients || 0;

    // Log the push attempt
    await supabase
      .from('push_notifications')
      .insert({
        title,
        message,
        target_user_id: customerId,
        action_route: actionRoute,
        sent_by: user.id,
        success_count: success ? recipientCount : 0,
        failure_count: success ? 0 : playerIds.length,
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        pushed: success,
        recipients: recipientCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Delivery push error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});