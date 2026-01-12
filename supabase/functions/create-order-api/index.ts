import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CreateOrderRequest {
  customer_id?: string;
  customer_phone?: string;
  business_id: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  pickup_address?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  notes?: string;
  // Optional: auto-assign rider
  auto_assign_rider?: boolean;
  preferred_rider_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user if present
    let authenticatedUserId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      authenticatedUserId = user?.id || null;
    }

    const orderData: CreateOrderRequest = await req.json();

    console.log('=== CREATE ORDER API ===');
    console.log('Order data:', JSON.stringify(orderData, null, 2));

    // Validate required fields
    if (!orderData.business_id) {
      throw new Error('business_id is required');
    }
    if (!orderData.items || orderData.items.length === 0) {
      throw new Error('items array is required and cannot be empty');
    }
    if (!orderData.delivery_address) {
      throw new Error('delivery_address is required');
    }

    // Determine customer_id
    const customerId = orderData.customer_id || authenticatedUserId;
    if (!customerId && !orderData.customer_phone) {
      throw new Error('Either customer_id or customer_phone is required');
    }

    // Get business details for pickup address
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('name, owner_user_id')
      .eq('id', orderData.business_id)
      .single();

    if (bizError || !business) {
      throw new Error('Business not found');
    }

    // Create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        customer_phone: orderData.customer_phone,
        business_id: orderData.business_id,
        items: orderData.items,
        subtotal: orderData.subtotal || orderData.items.reduce((sum, i) => sum + (i.price * i.quantity), 0),
        delivery_fee: orderData.delivery_fee || 0,
        total: orderData.total || orderData.subtotal + (orderData.delivery_fee || 0),
        delivery_address: orderData.delivery_address,
        delivery_lat: orderData.delivery_lat,
        delivery_lng: orderData.delivery_lng,
        pickup_address: orderData.pickup_address || business.name,
        pickup_lat: orderData.pickup_lat,
        pickup_lng: orderData.pickup_lng,
        notes: orderData.notes,
        status: 'placed',
        eta: '25-35 min',
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    console.log('Order created:', order.id);

    // Notify customer
    if (customerId) {
      await supabase.from('notifications').insert({
        user_id: customerId,
        title: '🛒 Order Placed!',
        message: `Your order from ${business.name} has been placed successfully`,
        type: 'order',
        order_id: order.id,
      });
    }

    // Notify business owner
    if (business.owner_user_id) {
      await supabase.from('notifications').insert({
        user_id: business.owner_user_id,
        title: '🍽️ New Order!',
        message: `You have a new order worth Rs ${order.total}`,
        type: 'order',
        order_id: order.id,
      });
    }

    // Auto-assign rider if requested
    let assignedRider = null;
    if (orderData.auto_assign_rider || orderData.preferred_rider_id) {
      let riderId = orderData.preferred_rider_id;

      // If no preferred rider, find an available online rider
      if (!riderId) {
        const { data: availableRiders } = await supabase
          .from('riders')
          .select('id')
          .eq('is_online', true)
          .eq('is_active', true)
          .eq('is_blocked', false)
          .limit(1);

        if (availableRiders && availableRiders.length > 0) {
          riderId = availableRiders[0].id;
        }
      }

      if (riderId) {
        // Assign the rider
        const { data: updatedOrder, error: assignError } = await supabase
          .from('orders')
          .update({ rider_id: riderId })
          .eq('id', order.id)
          .select('*, riders(id, name, user_id)')
          .single();

        if (!assignError && updatedOrder) {
          assignedRider = updatedOrder.riders;

          // Send push notification to rider
          try {
            const notifyResponse = await fetch(`${supabaseUrl}/functions/v1/notify-rider`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                rider_id: riderId,
                order_id: order.id,
                notification_type: 'new_order',
                pickup_address: orderData.pickup_address || business.name,
                dropoff_address: orderData.delivery_address,
                order_total: order.total,
              }),
            });

            const notifyResult = await notifyResponse.json();
            console.log('Rider notification result:', notifyResult);
          } catch (notifyError) {
            console.error('Failed to notify rider:', notifyError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          status: order.status,
          total: order.total,
          eta: order.eta,
          created_at: order.created_at,
        },
        assigned_rider: assignedRider,
        message: assignedRider 
          ? `Order created and assigned to rider ${assignedRider.name}`
          : 'Order created successfully. Awaiting rider assignment.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Create order error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
