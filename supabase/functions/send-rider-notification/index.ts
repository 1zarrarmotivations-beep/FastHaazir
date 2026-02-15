// Supabase Edge Function for sending push notifications to riders
// This triggers when a new order/request is created

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Firebase Admin SDK for sending push notifications
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY') || ''

interface RiderDeviceToken {
    token: string
    rider_id: string
}

const sendPushNotification = async (token: string, title: string, body: string, data: Record<string, string>) => {
    if (!FCM_SERVER_KEY) {
        console.log('FCM_SERVER_KEY not configured, skipping push notification')
        return { success: false, error: 'FCM not configured' }
    }

    try {
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `key=${FCM_SERVER_KEY}`
            },
            body: JSON.stringify({
                to: token,
                notification: {
                    title,
                    body,
                    sound: 'order_alert',
                    badge: '1',
                    icon: 'ic_notification'
                },
                data,
                android: {
                    priority: 'high',
                    notification: {
                        channel_id: 'rider_orders',
                        sound: 'order_alert',
                        priority: 'high'
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'order_alert.wav',
                            badge: 1
                        }
                    }
                }
            })
        })

        const result = await response.json()
        console.log('FCM Response:', result)
        return { success: response.ok, result }
    } catch (error) {
        console.error('Push notification error:', error)
        return { success: false, error: String(error) }
    }
}

Deno.serve(async (req) => {
    try {
        // Get the order/request data from the request body
        const { order_id, order_type, pickup_address, dropoff_address, amount, customer_name } = await req.json()

        console.log('Processing notification for order:', order_id)

        // Find all online riders
        const { data: onlineRiders, error: riderError } = await supabase
            .from('riders')
            .select('id, user_id, name, is_online')
            .eq('is_online', true)
            .eq('is_active', true)

        if (riderError) {
            console.error('Error fetching riders:', riderError)
            return new Response(JSON.stringify({ error: riderError.message }), { status: 500 })
        }

        if (!onlineRiders || onlineRiders.length === 0) {
            console.log('No online riders found')
            return new Response(JSON.stringify({ message: 'No online riders', sent: 0 }), { status: 200 })
        }

        // Get device tokens for online riders
        const riderIds = onlineRiders.map(r => r.id)

        const { data: deviceTokens, error: tokenError } = await supabase
            .from('push_device_tokens')
            .select('token, rider_id')
            .in('rider_id', riderIds)

        if (tokenError) {
            console.error('Error fetching tokens:', tokenError)
        }

        // Build notification message
        const title = '🚗 New Delivery Order!'
        const body = order_type === 'rider_request'
            ? `Pickup: ${pickup_address.substring(0, 50)}... - Earn: Rs ${amount}`
            : `New order from ${customer_name || 'Customer'} - Rs ${amount}`

        const notificationData = {
            type: 'new_order',
            order_id: order_id || '',
            order_type: order_type || 'order',
            click_action: 'OPEN_RIDER_DASHBOARD'
        }

        // Send push notifications to all device tokens
        const results = []
        if (deviceTokens && deviceTokens.length > 0) {
            for (const deviceToken of deviceTokens) {
                const result = await sendPushNotification(
                    deviceToken.token,
                    title,
                    body,
                    notificationData
                )
                results.push({ rider_id: deviceToken.rider_id, ...result })
            }
        }

        // Also send to FCM tokens stored directly on riders table (if any)
        const { data: riderFcmTokens } = await supabase
            .from('riders')
            .select('id, fcm_token')
            .in('id', riderIds)
            .not('fcm_token', 'is', null)

        if (riderFcmTokens && riderFcmTokens.length > 0) {
            for (const rider of riderFcmTokens) {
                if (rider.fcm_token) {
                    const result = await sendPushNotification(
                        rider.fcm_token,
                        title,
                        body,
                        notificationData
                    )
                    results.push({ rider_id: rider.id, ...result })
                }
            }
        }

        // Log the notification in database
        await supabase.from('push_notifications').insert({
            title,
            body,
            notification_type: 'new_order',
            target_role: 'rider',
            sent_count: results.length,
            metadata: { order_id, order_type }
        })

        console.log(`Sent ${results.length} push notifications`)

        return new Response(JSON.stringify({
            success: true,
            sent: results.length,
            results
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('Function error:', error)
        return new Response(JSON.stringify({ error: String(error) }), { status: 500 })
    }
})
