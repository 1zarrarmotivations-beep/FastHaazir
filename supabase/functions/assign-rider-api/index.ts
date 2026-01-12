import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssignRiderRequest {
  order_id?: string;
  rider_request_id?: string;
  rider_id: string;
  notify_rider?: boolean; // default true
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Optionally verify authorization (admin, business owner, or system)
    const authHeader = req.headers.get('Authorization');
    let isAuthorized = false;
    let callerUserId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        callerUserId = user.id;
        
        // Check if caller is admin
        const { data: isAdmin } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        
        if (isAdmin) {
          isAuthorized = true;
        }
      }
    }

    // For system-to-system calls, check for service role key
    if (!isAuthorized && authHeader?.includes(supabaseServiceKey)) {
      isAuthorized = true;
    }

    // Allow the call for now (you can enforce auth later)
    // if (!isAuthorized) {
    //   throw new Error('Unauthorized');
    // }

    const requestData: AssignRiderRequest = await req.json();
    const { 
      order_id, 
      rider_request_id, 
      rider_id,
      notify_rider = true 
    } = requestData;

    console.log('=== ASSIGN RIDER API ===');
    console.log('Request:', JSON.stringify(requestData, null, 2));

    if (!rider_id) {
      throw new Error('rider_id is required');
    }

    if (!order_id && !rider_request_id) {
      throw new Error('Either order_id or rider_request_id is required');
    }

    // Verify rider exists and is available
    const { data: rider, error: riderError } = await supabase
      .from('riders')
      .select('id, user_id, name, is_online, is_active, is_blocked')
      .eq('id', rider_id)
      .single();

    if (riderError || !rider) {
      throw new Error('Rider not found');
    }

    if (rider.is_blocked) {
      throw new Error('Rider is blocked and cannot accept orders');
    }

    if (!rider.is_active) {
      throw new Error('Rider account is not active');
    }

    let assignmentResult: Record<string, unknown> = {};
    let pickupAddress: string | undefined;
    let dropoffAddress: string | undefined;
    let orderTotal: number | undefined;
    let customerId: string | null = null;

    if (order_id) {
      // Check if order exists and is not already assigned
      const { data: existingOrder, error: checkError } = await supabase
        .from('orders')
        .select('*, businesses(name)')
        .eq('id', order_id)
        .single();

      if (checkError || !existingOrder) {
        throw new Error('Order not found');
      }

      if (existingOrder.rider_id && existingOrder.rider_id !== rider_id) {
        throw new Error('Order is already assigned to another rider');
      }

      if (existingOrder.status === 'delivered' || existingOrder.status === 'cancelled') {
        throw new Error(`Cannot assign rider to ${existingOrder.status} order`);
      }

      // Assign rider to order
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({ 
          rider_id: rider_id,
          status: existingOrder.status === 'placed' ? 'preparing' : existingOrder.status
        })
        .eq('id', order_id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to assign rider: ${updateError.message}`);
      }

      assignmentResult = {
        type: 'order',
        id: order_id,
        status: updatedOrder.status,
      };

      pickupAddress = existingOrder.pickup_address || (existingOrder.businesses as { name: string })?.name;
      dropoffAddress = existingOrder.delivery_address;
      orderTotal = existingOrder.total;
      customerId = existingOrder.customer_id;

    } else if (rider_request_id) {
      // Check if rider request exists and is not already assigned
      const { data: existingRequest, error: checkError } = await supabase
        .from('rider_requests')
        .select('*')
        .eq('id', rider_request_id)
        .single();

      if (checkError || !existingRequest) {
        throw new Error('Rider request not found');
      }

      if (existingRequest.rider_id && existingRequest.rider_id !== rider_id) {
        throw new Error('Request is already assigned to another rider');
      }

      if (existingRequest.status === 'delivered' || existingRequest.status === 'cancelled') {
        throw new Error(`Cannot assign rider to ${existingRequest.status} request`);
      }

      // Assign rider to request
      const { data: updatedRequest, error: updateError } = await supabase
        .from('rider_requests')
        .update({ 
          rider_id: rider_id,
          status: 'preparing'
        })
        .eq('id', rider_request_id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to assign rider: ${updateError.message}`);
      }

      assignmentResult = {
        type: 'rider_request',
        id: rider_request_id,
        status: updatedRequest.status,
      };

      pickupAddress = existingRequest.pickup_address;
      dropoffAddress = existingRequest.dropoff_address;
      orderTotal = existingRequest.total;
      customerId = existingRequest.customer_id;
    }

    // Send push notification to rider
    let notificationResult = null;
    if (notify_rider) {
      try {
        const notifyResponse = await fetch(`${supabaseUrl}/functions/v1/notify-rider`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            rider_id: rider_id,
            order_id: order_id || undefined,
            rider_request_id: rider_request_id || undefined,
            notification_type: 'new_order',
            pickup_address: pickupAddress,
            dropoff_address: dropoffAddress,
            order_total: orderTotal,
          }),
        });

        notificationResult = await notifyResponse.json();
        console.log('Rider notification result:', notificationResult);
      } catch (notifyError) {
        console.error('Failed to send push notification:', notifyError);
        notificationResult = { error: 'Failed to send push notification' };
      }
    }

    // Notify customer about rider assignment
    if (customerId && rider.user_id) {
      await supabase.from('notifications').insert({
        user_id: customerId,
        title: '🎉 Rider Assigned!',
        message: `${rider.name} has been assigned to your delivery`,
        type: 'delivery',
        order_id: order_id || null,
        rider_request_id: rider_request_id || null,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        assignment: assignmentResult,
        rider: {
          id: rider.id,
          name: rider.name,
          is_online: rider.is_online,
        },
        notification: notificationResult,
        message: `Successfully assigned ${rider.name} to the ${assignmentResult.type}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Assign rider error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
