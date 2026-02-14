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
app.use(bodyParser.json());

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Check if vars are present
if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase env vars missing!");
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

// PayUp Configuration
const PAYUP_API_KEY = process.env.PAYUP_API_KEY;
const PAYUP_BASE_URL = 'https://dashboard.payup.pk/api';

// --- Handlers ---

// Create Payment Endpoint (handle both /api and root paths for safety)
const handleCreatePayment = async (req, res) => {
    try {
        const { order_id, user_id, amount } = req.body;

        if (!order_id || !amount || !user_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log(`Creating payment for Order: ${order_id}, Amount: ${amount}`);

        // Check for existing pending payment
        const { data: existingPayment } = await supabase
            .from('payments')
            .select('*')
            .eq('order_id', order_id)
            .eq('payment_status', 'pending')
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();

        if (existingPayment) {
            console.log('Found existing payment:', existingPayment.transaction_id);
            return res.json({
                transaction_id: existingPayment.transaction_id,
                qr_url: existingPayment.qr_url,
                payment_url: existingPayment.payment_url,
                expires_in: Math.floor((new Date(existingPayment.expires_at) - new Date()) / 1000)
            });
        }

        // Generate unique transaction ID
        const transaction_id = crypto.randomUUID();

        // Call PayUp API
        // Documentation: type "string", example "1500". 
        // Some apps might prefer "1500.00", let's try strict formatting.
        const formattedAmount = parseFloat(amount).toFixed(2);
        const payupPayload = {
            amount: formattedAmount,
            platform: "shopify" // Request official QR URL as well
        };

        console.log('Generating QR from PayUp:', payupPayload);

        const payupResponse = await axios.post(`${PAYUP_BASE_URL}/generate-qr`, payupPayload, {
            headers: {
                'Authorization': `Bearer ${PAYUP_API_KEY}`,
            }
        });

        const payupData = payupResponse.data;
        console.log('PayUp Response:', JSON.stringify(payupData));

        // Extract QR Content
        let qr_string = '';
        let official_qr_url = '';

        if (payupData.qrContent) {
            qr_string = payupData.qrContent;
        } else if (payupData.data && payupData.data.qr_string) {
            qr_string = payupData.data.qr_string;
        }

        if (payupData.qrUrl) {
            official_qr_url = payupData.qrUrl;
        }

        if (!qr_string || qr_string.includes('Error')) {
            throw new Error(qr_string || 'Failed to generate QR');
        }

        // Determine expiry (15 mins from now)
        const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        // Save to database
        const { data: payment, error: dbError } = await supabase
            .from('payments')
            .insert({
                order_id,
                user_id,
                transaction_id,
                amount,
                payment_method: 'payup_qr',
                payment_status: 'pending',
                qr_url: qr_string,
                payment_url: official_qr_url, // Storing official URL in payment_url column for reference
                expires_at
            })
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
        console.error('Payment Create Error:', error.response?.data || error.message);
        res.status(500).json({ error: error.message || 'Payment creation failed' });
    }
};

// Webhook Endpoint
const handleWebhook = async (req, res) => {
    try {
        const payload = req.body;
        console.log('Webhook payload:', JSON.stringify(payload));

        // Some verification logic here...
        const orderId = payload.orderId;
        const amount = payload.amount;

        if (!orderId) {
            console.warn('Webhook payload missing orderId');
            return res.status(200).send('OK');
        }

        // Find payment
        const { data: payment, error: fetchError } = await supabase
            .from('payments')
            .select('*')
            .eq('order_id', orderId)
            .eq('payment_status', 'pending')
            .single();

        if (fetchError || !payment) {
            console.warn('Payment not found or not pending:', orderId);
            return res.status(200).send('OK');
        }

        // Update Payment Status
        const { error: updateError } = await supabase
            .from('payments')
            .update({ payment_status: 'paid' })
            .eq('id', payment.id);

        if (updateError) throw updateError;

        // Update Order Status
        const { error: orderUpdateError } = await supabase
            .from('orders')
            .update({
                status: 'preparing',
            })
            .eq('id', payment.order_id);

        if (orderUpdateError) console.error('Error updating order:', orderUpdateError);

        res.status(200).send('OK');

    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).send('Webhook failed');
    }
};

// Verification Endpoint
const handleVerify = async (req, res) => {
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

        res.json({ status: payment.payment_status });

    } catch (error) {
        console.error('Verify Error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
};

// Claim Endpoint (Manual "I have Paid")
const handleClaimPayment = async (req, res) => {
    try {
        const { transaction_id } = req.body;
        console.log('User claiming payment for:', transaction_id);

        const { data: payment, error } = await supabase
            .from('payments')
            .select('*')
            .eq('transaction_id', transaction_id)
            .single();

        if (error || !payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Update Payment Status to 'waiting_verification' (or similar custom status)
        // Here we will use 'waiting_approval' to distinguish from initial 'pending'
        const { error: updateError } = await supabase
            .from('payments')
            .update({ payment_status: 'waiting_approval' })
            .eq('id', payment.id);

        if (updateError) throw updateError;

        // Also update Order status to 'preparing' (or 'pending_payment_approval')
        // The user wants the flow to continue.
        const { error: orderUpdateError } = await supabase
            .from('orders')
            .update({
                status: 'preparing',
            })
            .eq('id', payment.order_id);

        if (orderUpdateError) console.error('Error updating order on claim:', orderUpdateError);

        res.json({ success: true, message: 'Payment marked for approval' });

    } catch (error) {
        console.error('Claim Error:', error);
        res.status(500).json({ error: 'Claim failed' });
    }
};

// --- Routes ---

app.post('/payments/create', handleCreatePayment);
app.post('/api/payments/create', handleCreatePayment);

app.post('/payments/webhook', handleWebhook);
app.post('/api/payments/webhook', handleWebhook);

app.get('/payments/verify/:transaction_id', handleVerify);
app.get('/api/payments/verify/:transaction_id', handleVerify);

app.post('/payments/claim', handleClaimPayment);
app.post('/api/payments/claim', handleClaimPayment);

// Catch-all
app.use((req, res) => {
    console.log(`404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Endpoint not found', path: req.url });
});

// Expose Express App as a single Cloud Function
exports.api = onRequest(app);
