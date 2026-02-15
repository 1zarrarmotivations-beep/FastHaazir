const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Config for Firebase Functions
setGlobalOptions({ maxInstances: 10 });

const app = express();

// Middleware
app.use(cors({ origin: true }));
// Verification of raw body for webhook signatures
app.use(bodyParser.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://jqbwynomwwjhsebcicpm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Only server-side
const supabase = createClient(supabaseUrl, supabaseKey);

// PayUp Configuration
const PAYUP_API_KEY = process.env.PAYUP_API_KEY;
const PAYUP_BASE_URL = 'https://dashboard.payup.pk/api';

// Helper function to generate QR string for PayUp
const generatePayUpQRString = (amount, orderId) => {
    const payload = {
        m: 'PK', // Country code
        am: amount.toFixed(2), // Amount
        mn: 'FastHaazir', // Merchant name
        rd: 'Y', // Require dynamic QR
        rq: orderId, // Reference/Order ID
        tn: `Order #${orderId}` // Transaction note
    };
    return JSON.stringify(payload);
};

// ==========================================
// PAYMENT ENDPOINTS
// ==========================================

// Create Payment Endpoint
app.post('/api/payments/create', async (req, res) => {
    try {
        const { order_id, rider_request_id, user_id, amount } = req.body;

        if (!(order_id || rider_request_id) || !amount || !user_id) {
            return res.status(400).json({ error: 'Missing required fields: (order_id or rider_request_id), user_id, amount' });
        }

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const targetId = order_id || rider_request_id;
        console.log('Creating payment for:', targetId, 'amount:', numericAmount);

        // Check for existing pending payment
        const query = supabase
            .from('payments')
            .select('*')
            .eq('payment_status', 'pending')
            .gt('expires_at', new Date().toISOString());

        if (order_id) query.eq('order_id', order_id);
        else query.eq('rider_request_id', rider_request_id);

        const { data: existingPayment } = await query.maybeSingle();

        if (existingPayment) {
            console.log('Returning existing payment:', existingPayment.transaction_id);
            return res.json({
                transaction_id: existingPayment.transaction_id,
                qr_url: existingPayment.qr_url,
                payment_url: existingPayment.payment_url,
                expires_in: Math.floor((new Date(existingPayment.expires_at) - new Date()) / 1000)
            });
        }

        const transaction_id = crypto.randomUUID();
        const qr_string = generatePayUpQRString(numericAmount, targetId);
        const payment_url = `${PAYUP_BASE_URL}/pay?data=${encodeURIComponent(qr_string)}`;
        const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        const insertPayload = {
            user_id,
            transaction_id,
            amount: numericAmount,
            payment_method: 'payup_qr',
            payment_status: 'pending',
            qr_url: qr_string,
            payment_url: payment_url,
            expires_at
        };

        if (order_id) insertPayload.order_id = order_id;
        if (rider_request_id) insertPayload.rider_request_id = rider_request_id;

        const { data: payment, error: dbError } = await supabase
            .from('payments')
            .insert(insertPayload)
            .select()
            .single();

        if (dbError) {
            console.error('Supabase Insert Error:', dbError);
            throw dbError;
        }

        res.json({
            transaction_id: payment.transaction_id,
            qr_url: payment.qr_url,
            payment_url: payment.payment_url,
            expires_in: 15 * 60
        });

    } catch (error) {
        console.error('Payment Create Error:', error.message);
        res.status(500).json({ error: error.message || 'Payment creation failed' });
    }
});

// PayUp Webhook Signature Verification (Conceptual)
const verifyPayUpSignature = (payload, signature) => {
    if (!signature || !PAYUP_API_KEY) return true; // TODO: Implement strict verification when key is verified
    // Example: hmac-sha256 of payload with API key
    return true;
};

// Webhook Endpoint
app.post('/api/payments/webhook', async (req, res) => {
    try {
        const payload = req.body;
        const signature = req.headers['x-payup-signature'];

        console.log('Webhook Received:', JSON.stringify(payload));

        if (!verifyPayUpSignature(payload, signature)) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        // Handle various PayUp field versions
        const orderId = payload.order_id || payload.orderId || payload.reference_id || payload.rq;
        const status = payload.status || payload.payment_status || payload.st;
        const payupTransactionId = payload.transaction_id || payload.txn_id || payload.txnId;

        if (!orderId) {
            return res.status(200).json({ received: true, message: 'No reference ID found' });
        }

        // Find payment by order_id or rider_request_id
        const { data: payment, error: fetchError } = await supabase
            .from('payments')
            .select('*')
            .or(`order_id.eq."${orderId}",rider_request_id.eq."${orderId}"`)
            .eq('payment_status', 'pending')
            .maybeSingle();

        if (fetchError || !payment) {
            console.log('Payment not found or already processed for ID:', orderId);
            return res.status(200).json({ received: true, message: 'Payment not found or processed' });
        }

        let paymentStatus = 'pending';
        // Map various success statuses
        const successStatuses = ['success', 'SUCCESS', 'paid', 'PAID', 'COMPLETED', 'completed', 'Verified'];
        if (successStatuses.includes(status)) {
            paymentStatus = 'paid';
        } else if (['failed', 'FAILED', 'expired', 'EXPIRED', 'rejected'].includes(status)) {
            paymentStatus = 'failed';
        }

        // Update payment record
        const { error: updateError } = await supabase
            .from('payments')
            .update({
                payment_status: paymentStatus,
                payup_transaction_id: payupTransactionId || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', payment.id);

        if (updateError) throw updateError;

        // If paid, update the actual business entity (Order or Rider Request)
        if (paymentStatus === 'paid') {
            if (payment.order_id) {
                await supabase
                    .from('orders')
                    .update({ payment_status: 'paid', status: 'preparing' })
                    .eq('id', payment.order_id);

                // Trigger notification
                await supabase.rpc('create_notification', {
                    _user_id: payment.user_id,
                    _title: '💰 Payment Received!',
                    _message: `Rs. ${payment.amount} received for Order #${payment.order_id.substring(0, 8)}`,
                    _type: 'payment',
                    _order_id: payment.order_id
                });
            } else if (payment.rider_request_id) {
                await supabase
                    .from('rider_requests')
                    .update({ status: 'preparing' }) // We might need a payment_status column here eventually
                    .eq('id', payment.rider_request_id);

                // Trigger notification
                await supabase.rpc('create_notification', {
                    _user_id: payment.user_id,
                    _title: '💰 Payment Received!',
                    _message: `Rs. ${payment.amount} received for Delivery #${payment.rider_request_id.substring(0, 8)}`,
                    _type: 'payment',
                    _rider_request_id: payment.rider_request_id
                });
            }
        }

        res.status(200).json({ received: true, status: paymentStatus });

    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Verification Endpoint (Frontend Polling)
app.get('/api/payments/verify/:transaction_id', async (req, res) => {
    try {
        const { transaction_id } = req.params;
        const { data: payment, error } = await supabase
            .from('payments')
            .select('*')
            .eq('transaction_id', transaction_id)
            .single();

        if (error || !payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Handle expiration during check
        if (payment.payment_status === 'pending' && new Date(payment.expires_at) < new Date()) {
            await supabase.from('payments').update({ payment_status: 'failed' }).eq('id', payment.id);
            return res.json({ status: 'expired' });
        }

        res.json({
            status: payment.payment_status,
            amount: payment.amount,
            order_id: payment.order_id || payment.rider_request_id,
            expires_at: payment.expires_at
        });
    } catch (error) {
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Manual Claim Endpoint
app.post('/api/payments/claim', async (req, res) => {
    try {
        const { transaction_id } = req.body;
        const { data: payment, error } = await supabase
            .from('payments')
            .select('*')
            .eq('transaction_id', transaction_id)
            .single();

        if (error || !payment) return res.status(404).json({ error: 'Payment not found' });

        if (payment.payment_status === 'pending') {
            await supabase.from('payments').update({
                payment_status: 'claimed',
                admin_notes: 'User manually clicked "I have paid"',
                updated_at: new Date().toISOString()
            }).eq('id', payment.id);
        }

        res.json({ success: true, message: 'Payment claim submitted. Admin will verify shortly.' });
    } catch (error) {
        res.status(500).json({ error: 'Claim failed' });
    }
});

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

// Middleware to verify admin status using JWT
const verifyAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

        const token = authHeader.split(' ')[1];
        // Use service role client to ensure we can check roles even if rules are tight
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Check if user is admin via RPC
        const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
            _user_id: user.id,
            _role: 'admin'
        });

        if (roleError || !isAdmin) {
            console.warn(`Unauthorized admin attempt by user: ${user.id}`);
            return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
        }

        req.admin = user;
        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        res.status(500).json({ error: 'Authentication check failed' });
    }
};

// Admin: Manually Confirm Payment
app.post('/api/admin/payments/confirm', verifyAdmin, async (req, res) => {
    try {
        const { payment_id, notes, admin_name } = req.body;
        const adminName = admin_name || req.admin.email || "System Admin";

        const { data: payment, error: fetchError } = await supabase
            .from('payments')
            .select('*')
            .eq('id', payment_id)
            .single();

        if (fetchError || !payment) return res.status(404).json({ error: 'Payment record not found' });
        if (payment.payment_status === 'paid') return res.status(400).json({ error: 'Already marked as paid' });

        // Update payment table
        await supabase.from('payments').update({
            payment_status: 'paid',
            approved_by_name: adminName,
            admin_notes: notes || 'Manually approved by admin',
            updated_at: new Date().toISOString()
        }).eq('id', payment.id);

        // Update business entities
        if (payment.order_id) {
            await supabase.from('orders').update({
                payment_status: 'paid',
                status: 'preparing',
                updated_at: new Date().toISOString()
            }).eq('id', payment.order_id);
        } else if (payment.rider_request_id) {
            await supabase.from('rider_requests').update({
                status: 'preparing',
                updated_at: new Date().toISOString()
            }).eq('id', payment.rider_request_id);
        }

        // Notify user
        await supabase.rpc('create_notification', {
            _user_id: payment.user_id,
            _title: '✅ Payment Confirmed!',
            _message: `Your payment of Rs. ${payment.amount} has been verified by admin.`,
            _type: 'payment',
            _order_id: payment.order_id,
            _rider_request_id: payment.rider_request_id
        });

        res.json({ success: true, message: 'Payment confirmed and order/request activated' });
    } catch (error) {
        console.error('Admin Confirm Error:', error);
        res.status(500).json({ error: 'Manual confirmation failed' });
    }
});

// Expose Express App as a single Cloud Function
exports.api = onRequest({ timeoutSeconds: 60, region: "us-central1" }, app);
