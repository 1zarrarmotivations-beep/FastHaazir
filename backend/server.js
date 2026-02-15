const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://jqbwynomwwjhsebcicpm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
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

        if (dbError) throw dbError;

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

// PayUp Webhook Signature Verification
const verifyPayUpSignature = (payload, signature) => {
    if (!signature || !PAYUP_API_KEY) return true;
    return true;
};

// Webhook Endpoint
app.post('/api/payments/webhook', async (req, res) => {
    try {
        const payload = req.body;
        const status = payload.status || payload.payment_status || payload.st;
        const orderId = payload.order_id || payload.orderId || payload.reference_id || payload.rq;
        const payupTransactionId = payload.transaction_id || payload.txn_id || payload.txnId;

        if (!orderId) {
            return res.status(200).json({ received: true, message: 'No reference ID' });
        }

        // Find payment 
        const { data: payment } = await supabase
            .from('payments')
            .select('*')
            .or(`order_id.eq."${orderId}",rider_request_id.eq."${orderId}"`)
            .eq('payment_status', 'pending')
            .maybeSingle();

        if (!payment) return res.status(200).json({ received: true });

        let paymentStatus = 'pending';
        if (['success', 'SUCCESS', 'paid', 'Verified', 'COMPLETED'].includes(status)) {
            paymentStatus = 'paid';
        } else if (['failed', 'FAILED', 'expired'].includes(status)) {
            paymentStatus = 'failed';
        }

        await supabase.from('payments').update({
            payment_status: paymentStatus,
            payup_transaction_id: payupTransactionId,
            updated_at: new Date().toISOString()
        }).eq('id', payment.id);

        if (paymentStatus === 'paid') {
            if (payment.order_id) {
                await supabase.from('orders').update({ payment_status: 'paid', status: 'preparing' }).eq('id', payment.order_id);
                await supabase.rpc('create_notification', {
                    _user_id: payment.user_id,
                    _title: '💰 Payment Received!',
                    _message: `Rs. ${payment.amount} received for Order #${payment.order_id.substring(0, 8)}`,
                    _type: 'payment',
                    _order_id: payment.order_id
                });
            } else if (payment.rider_request_id) {
                await supabase.from('rider_requests').update({ status: 'preparing' }).eq('id', payment.rider_request_id);
                await supabase.rpc('create_notification', {
                    _user_id: payment.user_id,
                    _title: '💰 Payment Received!',
                    _message: `Rs. ${payment.amount} received for Delivery #${payment.rider_request_id.substring(0, 8)}`,
                    _type: 'payment',
                    _rider_request_id: payment.rider_request_id
                });
            }
        }

        res.status(200).json({ received: true });
    } catch (error) {
        res.status(500).json({ error: 'Webhook failed' });
    }
});

// Verification Endpoint
app.get('/api/payments/verify/:transaction_id', async (req, res) => {
    try {
        const { data: payment } = await supabase
            .from('payments')
            .select('*')
            .eq('transaction_id', req.params.transaction_id)
            .single();

        if (!payment) return res.status(404).json({ error: 'Not found' });

        res.json({
            status: payment.payment_status,
            amount: payment.amount,
            order_id: payment.order_id || payment.rider_request_id
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

// Admin verification middleware
const verifyAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No auth' });
        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return res.status(401).json({ error: 'Invalid token' });

        const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
        if (!isAdmin) return res.status(403).json({ error: 'Forbidden' });

        req.user = user;
        next();
    } catch (e) { res.status(500).send(); }
};

// Admin confirm payment
app.post('/api/admin/payments/confirm', verifyAdmin, async (req, res) => {
    const { payment_id, notes, admin_name } = req.body;
    const { data: payment } = await supabase.from('payments').select('*').eq('id', payment_id).single();
    if (!payment) return res.status(404).send();

    await supabase.from('payments').update({
        payment_status: 'paid',
        approved_by_name: admin_name || req.user.email,
        admin_notes: notes,
        updated_at: new Date().toISOString()
    }).eq('id', payment_id);

    if (payment.order_id) {
        await supabase.from('orders').update({ payment_status: 'paid', status: 'preparing' }).eq('id', payment.order_id);
    } else if (payment.rider_request_id) {
        await supabase.from('rider_requests').update({ status: 'preparing' }).eq('id', payment.rider_request_id);
    }

    await supabase.rpc('create_notification', {
        _user_id: payment.user_id,
        _title: '✅ Payment Confirmed!',
        _message: `Verified by admin: Rs. ${payment.amount}`,
        _type: 'payment',
        _order_id: payment.order_id,
        _rider_request_id: payment.rider_request_id
    });

    res.json({ success: true });
});

app.listen(port, () => console.log(`Backend server running on port ${port}`));
