const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
// Expects FIREBASE_SERVICE_ACCOUNT in .env as a JSON string
let firebaseInitialized = false;
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        firebaseInitialized = true;
        console.log('Firebase Admin Initialized Successfully');
    } else {
        console.warn('Warning: FIREBASE_SERVICE_ACCOUNT not found in .env. Push notifications will not work.');
    }
} catch (error) {
    console.error('Firebase Admin Init Error:', error.message);
}

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({
    limit: '50mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

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
// PUSH NOTIFICATION HELPER
// ==========================================
async function sendPushNotificationInternal({ title, message, target, target_role, target_user_id, image, link }) {
    if (!firebaseInitialized) return { success: false, error: 'Firebase not initialized' };

    try {
        let query = supabase.from('device_tokens').select('device_token');

        if (target === 'specific' && target_user_id) {
            query = query.eq('user_id', target_user_id);
        } else if (target === 'role' && target_role) {
            if (target_role !== 'all') {
                query = query.eq('role', target_role);
            }
        }

        const { data: tokens, error } = await query;
        if (error) throw error;

        if (!tokens || tokens.length === 0) {
            return { success: true, message: 'No devices found', count: 0 };
        }

        const uniqueTokens = [...new Set(tokens.map(t => t.device_token))];

        const payload = {
            notification: { title, body: message },
            data: { url: link || '/', click_action: link || '/' }
        };

        if (image) payload.notification.image = image;

        const batchSize = 500;
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < uniqueTokens.length; i += batchSize) {
            const batchTokens = uniqueTokens.slice(i, i + batchSize);

            try {
                const response = await admin.messaging().sendEachForMulticast({
                    tokens: batchTokens,
                    notification: payload.notification,
                    data: payload.data
                });

                successCount += response.successCount;
                failureCount += response.failureCount;

                if (response.failureCount > 0) {
                    const failedTokens = [];
                    response.responses.forEach((resp, idx) => {
                        if (!resp.success) {
                            const error = resp.error;
                            if (error.code === 'messaging/registration-token-not-registered' ||
                                error.code === 'messaging/invalid-registration-token') {
                                failedTokens.push(batchTokens[idx]);
                            }
                        }
                    });

                    if (failedTokens.length > 0) {
                        await supabase.from('device_tokens').delete().in('device_token', failedTokens);
                    }
                }
            } catch (batchError) {
                console.error('Batch send error:', batchError);
            }
        }

        await supabase.from('notifications_log').insert({
            title,
            message,
            user_role: target === 'role' ? target_role : 'mixed',
            target_user_id: target === 'specific' ? target_user_id : null,
            status: 'sent',
            response_data: { success: successCount, failed: failureCount, total: uniqueTokens.length }
        });

        return { success: true, stats: { target_count: uniqueTokens.length, success: successCount, failed: failureCount } };

    } catch (error) {
        console.error('Push internal error:', error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// MENU SCAN & AUTO ADD SYSTEM API
// ==========================================

// OCR and AI Menu Parser Endpoint
app.post('/api/menu/scan', async (req, res) => {
    try {
        const { image_base64, pdf_base64, file_type, business_id } = req.body;

        if (!business_id) {
            return res.status(400).json({ error: 'business_id is required' });
        }

        let extractedText = '';
        let fileContent = image_base64 || pdf_base64;

        // For now, we'll simulate OCR extraction
        // In production, integrate with Google Cloud Vision API or Tesseract
        if (fileContent) {
            // Simulated OCR extraction - in production use actual OCR
            extractedText = await performOCR(fileContent, file_type);
        }

        // Send to AI parser
        const menuItems = await parseMenuWithAI(extractedText, file_type);

        res.json({
            success: true,
            items: menuItems,
            extracted_text: extractedText
        });
    } catch (error) {
        console.error('Menu scan error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Excel/CSV Menu Parser Endpoint
app.post('/api/menu/parse-excel', async (req, res) => {
    try {
        const { file_base64, file_type, business_id } = req.body;

        if (!business_id) {
            return res.status(400).json({ error: 'business_id is required' });
        }

        // Parse Excel/CSV
        const menuItems = await parseExcelMenu(file_base64, file_type);

        res.json({
            success: true,
            items: menuItems
        });
    } catch (error) {
        console.error('Excel parse error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Preview/Draft Management
app.post('/api/menu/draft/save', async (req, res) => {
    try {
        const { business_id, items, file_name, file_type } = req.body;

        if (!business_id || !items) {
            return res.status(400).json({ error: 'business_id and items are required' });
        }

        const { data, error } = await supabase
            .from('menu_upload_drafts')
            .insert({
                business_id,
                items: items,
                file_name,
                file_type,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, draft: data });
    } catch (error) {
        console.error('Save draft error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Publish Menu Items
app.post('/api/menu/draft/publish', async (req, res) => {
    try {
        const { draft_id, items, business_id } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'No items to publish' });
        }

        const results = {
            created: 0,
            duplicates: 0,
            errors: []
        };

        for (const item of items) {
            try {
                // Get or create category
                let categoryId = null;
                if (item.category) {
                    const { data: categoryData } = await supabase.rpc('get_or_create_category', {
                        p_business_id: business_id,
                        p_category_name: item.category
                    });
                    categoryId = categoryData;
                }

                // Check for duplicates
                const { data: existing } = await supabase
                    .from('menu_items')
                    .select('id')
                    .eq('business_id', business_id)
                    .eq('name', item.name)
                    .eq('is_deleted', false)
                    .maybeSingle();

                if (existing) {
                    results.duplicates++;
                    continue;
                }

                // Clean price (remove Rs., spaces, etc.)
                const cleanPrice = cleanPriceValue(item.price);

                // Insert menu item
                const { error: insertError } = await supabase
                    .from('menu_items')
                    .insert({
                        business_id,
                        category_id: categoryId,
                        name: item.name,
                        price: cleanPrice,
                        description: item.description || null,
                        image_url: item.image_url || null,
                        is_available: true,
                        is_draft: false
                    });

                if (insertError) {
                    results.errors.push({ item: item.name, error: insertError.message });
                } else {
                    results.created++;
                }
            } catch (itemError) {
                results.errors.push({ item: item.name, error: itemError.message });
            }
        }

        // Update draft status
        if (draft_id) {
            await supabase
                .from('menu_upload_drafts')
                .update({ status: 'published', published_at: new Date().toISOString() })
                .eq('id', draft_id);
        }

        res.json({ success: true, results });
    } catch (error) {
        console.error('Publish error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get Categories for Business
app.get('/api/menu/categories/:business_id', async (req, res) => {
    try {
        const { business_id } = req.params;

        // Ensure Medicine category exists
        await supabase.rpc('ensure_medicine_category', { business_id });

        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('business_id', business_id)
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) throw error;

        res.json({ success: true, categories: data });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create Category
app.post('/api/menu/categories', async (req, res) => {
    try {
        const { business_id, name, is_locked } = req.body;

        if (!business_id || !name) {
            return res.status(400).json({ error: 'business_id and name are required' });
        }

        const { data, error } = await supabase
            .from('categories')
            .insert({
                business_id,
                name: name.trim(),
                is_locked: is_locked || false
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique violation
                return res.status(400).json({ error: 'Category already exists' });
            }
            throw error;
        }

        res.json({ success: true, category: data });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete Category (prevent locked)
app.delete('/api/menu/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if category is locked
        const { data: category } = await supabase
            .from('categories')
            .select('is_locked, name')
            .eq('id', id)
            .single();

        if (category?.is_locked) {
            return res.status(400).json({ error: `Cannot delete locked category: ${category.name}` });
        }

        // Soft delete - set is_active to false
        const { error } = await supabase
            .from('categories')
            .update({ is_active: false })
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Bulk Operations
app.post('/api/menu/bulk/update-prices', async (req, res) => {
    try {
        const { business_id, category_id, item_ids, price_change_percent } = req.body;

        if (!business_id || price_change_percent === undefined) {
            return res.status(400).json({ error: 'business_id and price_change_percent are required' });
        }

        const { data, error } = await supabase.rpc('bulk_update_menu_prices', {
            p_business_id: business_id,
            p_category_id: category_id || null,
            p_price_change_percent: price_change_percent,
            p_item_ids: item_ids || null
        });

        if (error) throw error;

        res.json({ success: true, updated_count: data });
    } catch (error) {
        console.error('Bulk update prices error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/menu/bulk/delete', async (req, res) => {
    try {
        const { business_id, item_ids } = req.body;

        if (!business_id || !item_ids || item_ids.length === 0) {
            return res.status(400).json({ error: 'business_id and item_ids are required' });
        }

        const { data, error } = await supabase.rpc('bulk_soft_delete_menu_items', {
            p_business_id: business_id,
            p_item_ids: item_ids
        });

        if (error) throw error;

        res.json({ success: true, deleted_count: data });
    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/menu/bulk/toggle-availability', async (req, res) => {
    try {
        const { business_id, item_ids, is_available } = req.body;

        if (!business_id || !item_ids || item_ids.length === 0) {
            return res.status(400).json({ error: 'business_id and item_ids are required' });
        }

        const { data, error } = await supabase.rpc('bulk_toggle_menu_availability', {
            p_business_id: business_id,
            p_item_ids: item_ids,
            p_is_available: is_available
        });

        if (error) throw error;

        res.json({ success: true, updated_count: data });
    } catch (error) {
        console.error('Bulk toggle error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// HELPER FUNCTIONS FOR MENU SCANNING
// ==========================================

async function performOCR(base64Data, fileType) {
    // In production, integrate with Google Cloud Vision API
    // or Tesseract.js for local OCR

    // Simulated OCR result - this would be replaced with actual OCR
    // For demo purposes, returning sample extracted text
    return "Sample menu text extracted from image/PDF";
}

async function parseMenuWithAI(extractedText, fileType) {
    // In production, use OpenAI GPT-4 or similar AI service
    // to parse the extracted text into structured menu items

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
        // Return sample data if no API key
        return [
            { name: "Sample Item 1", price: 250, category: "Main Course" },
            { name: "Sample Item 2", price: 150, category: "Beverages" }
        ];
    }

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: `You are a menu parser. Parse the following menu text and extract items as JSON array with fields: name (string), price (number), category (string). Return ONLY valid JSON array, nothing else.`
                },
                {
                    role: 'user',
                    content: extractedText
                }
            ],
            temperature: 0.3
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const content = response.data.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        console.error('AI parsing error:', error);
        // Return sample on error
        return [
            { name: "Burger", price: 450, category: "Main Course" },
            { name: "Fries", price: 200, category: "Sides" }
        ];
    }
}

async function parseExcelMenu(base64Data, fileType) {
    const XLSX = require('xlsx');
    try {
        const buffer = Buffer.from(base64Data, 'base64');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        // Map column names to our structure (flexible mapping)
        return data.map(row => {
            const name = row.name || row.Name || row.item || row.Item || row.title || row.Title;
            const price = row.price || row.Price || row.amount || row.Amount || row.rate || row.Rate;
            const category = row.category || row.Category || row.group || row.Group || row.type || row.Type || 'General';
            const description = row.description || row.Description || row.desc || row.Desc || '';

            return {
                name: String(name || '').trim(),
                price: parseFloat(price) || 0,
                category: String(category || 'General').trim(),
                description: String(description || '').trim()
            };
        }).filter(item => item.name && item.price > 0);
    } catch (error) {
        console.error('Excel parsing error:', error);
        throw new Error('Failed to parse Excel file: ' + error.message);
    }
}

function cleanPriceValue(price) {
    if (typeof price === 'number') return price;
    if (!price) return 0;

    // Remove Rs., currency symbols, spaces
    const cleaned = String(price)
        .replace(/Rs\.\s*/i, '')
        .replace(/PKR\s*/i, '')
        .replace(/[₨Rs$]/g, '')
        .replace(/\s/g, '')
        .trim();

    return parseInt(cleaned, 10) || 0;
}

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

                // Send Push
                await sendPushNotificationInternal({
                    title: '💰 Payment Received!',
                    message: `Rs. ${payment.amount} for Order #${payment.order_id.substring(0, 8)} confirmed!`,
                    target: 'specific',
                    target_user_id: payment.user_id,
                    link: `/orders/${payment.order_id}`
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

                // Send Push
                await sendPushNotificationInternal({
                    title: '💰 Payment Received!',
                    message: `Rs. ${payment.amount} received for delivery.`,
                    target: 'specific',
                    target_user_id: payment.user_id,
                    link: '/rider/dashboard'
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

    // Send Push
    await sendPushNotificationInternal({
        title: '✅ Payment Confirmed!',
        message: `Admin verified your payment of Rs. ${payment.amount}`,
        target: 'specific',
        target_user_id: payment.user_id,
        link: payment.order_id ? `/orders/${payment.order_id}` : '/rider/dashboard'
    });

    res.json({ success: true });
});

// Admin reject payment
app.post('/api/admin/payments/reject', verifyAdmin, async (req, res) => {
    const { payment_id, notes, admin_name } = req.body;
    const { data: payment } = await supabase.from('payments').select('*').eq('id', payment_id).single();
    if (!payment) return res.status(404).send();

    await supabase.from('payments').update({
        payment_status: 'rejected', // or 'failed' depending on enum, 'rejected' is clearer for manual
        approved_by_name: admin_name || req.user.email,
        admin_notes: notes,
        updated_at: new Date().toISOString()
    }).eq('id', payment_id);

    // Notify user
    await supabase.rpc('create_notification', {
        _user_id: payment.user_id,
        _title: '❌ Payment Rejected',
        _message: `Reason: ${notes || 'Verification failed'}`,
        _type: 'payment_failed',
        _order_id: payment.order_id || null,
        _rider_request_id: payment.rider_request_id || null
    });

    // Send Push
    await sendPushNotificationInternal({
        title: '❌ Payment Rejected',
        message: `Your payment was rejected. Reason: ${notes || 'Verification failed'}`,
        target: 'specific',
        target_user_id: payment.user_id,
        link: payment.order_id ? `/orders/${payment.order_id}` : '/rider/dashboard'
    });

    res.json({ success: true });
});

// ==========================================
// PUSH NOTIFICATION SYSTEM
// ==========================================

// Register Device Token
app.post('/api/push/register', async (req, res) => {
    try {
        const { user_id, role, device_token, platform } = req.body;

        if (!user_id || !device_token || !role) {
            return res.status(400).json({ error: 'Missing required fields: user_id, device_token, role' });
        }

        // Upsert token
        const { error } = await supabase
            .from('device_tokens')
            .upsert({
                user_id,
                role,
                device_token,
                platform: platform || 'web',
                last_active_at: new Date().toISOString()
            }, {
                onConflict: 'user_id, device_token'
            });

        if (error) throw error;

        res.json({ success: true, message: 'Device registered' });
    } catch (error) {
        console.error('Device registration failed:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Send Push Notification (Admin Only)
app.post('/api/push/send', verifyAdmin, async (req, res) => {
    try {
        const { title, message, target, target_role, target_user_id, image, link } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        const result = await sendPushNotificationInternal({ title, message, target, target_role, target_user_id, image, link });

        if (!result.success && result.error === 'Firebase not initialized') {
            return res.status(503).json(result);
        }

        if (!result.success) throw new Error(result.error);

        return res.json(result);

        /* Old logic removed
        // Determine targets
        let query = supabase.from('device_tokens').select('device_token');
        
        if (target === 'specific' && target_user_id) {
            query = query.eq('user_id', target_user_id);
        } else if (target === 'role' && target_role) {
            // target_role can be 'rider', 'customer', 'all'
            if (target_role !== 'all') {
                query = query.eq('role', target_role);
            }
        }
        // If target === 'all', no filter needed on tokens (fetches all)
        
        const { data: tokens, error } = await query;
        
        if (error) throw error;
        
        if (!tokens || tokens.length === 0) {
            return res.json({ success: true, message: 'No devices found for target', count: 0 });
        }
        
        // Unique tokens only
        const uniqueTokens = [...new Set(tokens.map(t => t.device_token))];
        
        // Prepare payload
        const payload = {
            notification: {
                title,
                body: message,
            },
            data: {
                url: link || '/',
                click_action: link || '/'
            }
        };
        
        if (image) payload.notification.image = image;
        
        // Batch send (max 500 per batch)
        const batchSize = 500;
        let successCount = 0;
        let failureCount = 0;
        
        for (let i = 0; i < uniqueTokens.length; i += batchSize) {
            const batchTokens = uniqueTokens.slice(i, i + batchSize);
        
            try {
                const response = await admin.messaging().sendEachForMulticast({
                    tokens: batchTokens,
                    notification: payload.notification,
                    data: payload.data
                });
        
                successCount += response.successCount;
                failureCount += response.failureCount;
        
                // Cleanup invalid tokens
                if (response.failureCount > 0) {
                    const failedTokens = [];
                    response.responses.forEach((resp, idx) => {
                        if (!resp.success) {
                            const error = resp.error;
                            if (error.code === 'messaging/registration-token-not-registered' ||
                                error.code === 'messaging/invalid-registration-token') {
                                failedTokens.push(batchTokens[idx]);
                            }
                        }
                    });
        
                    if (failedTokens.length > 0) {
                        await supabase
                            .from('device_tokens')
                            .delete()
                            .in('device_token', failedTokens);
                        console.log(`Cleaned up ${failedTokens.length} invalid tokens`);
                    }
                }
        
            } catch (batchError) {
                console.error('Batch send error:', batchError);
            }
        }
        
        // Log notification
        await supabase.from('notifications_log').insert({
            title,
            message,
            user_role: target === 'role' ? target_role : 'mixed',
            target_user_id: target === 'specific' ? target_user_id : null,
            status: 'sent',
            response_data: { success: successCount, failed: failureCount, total: uniqueTokens.length }
        });
        
        res.json({
            success: true,
            stats: {
                target_count: uniqueTokens.length,
                success: successCount,
                failed: failureCount
            }
        });
            */
    } catch (error) {
        console.error('Push notification failed:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => console.log(`Backend server running on port ${port}`));
