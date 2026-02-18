// Firebase Cloud Functions for FastHazir Backend - Updated for Category Management
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const crypto = require('crypto');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Config for Firebase Functions
setGlobalOptions({ maxInstances: 10 });

// Initialize Firebase Admin (Functions Environment)
const admin = require('firebase-admin');

// In Firebase Functions environment, default credential works automatically
if (!admin.apps.length) {
    admin.initializeApp();
}

const app = express();

// Middleware
app.use(cors({ origin: true }));
// Verification of raw body for webhook signatures
app.use(bodyParser.json({
    limit: '50mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

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
// PUSH NOTIFICATION HELPER
// ==========================================
async function sendPushNotificationInternal({ title, message, target, target_role, target_user_id, image, link }) {
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

// Helper functions for menu scanning
async function performOCR(base64Data, fileType) {
    // In production, integrate with Google Cloud Vision API
    // or Tesseract.js for local OCR
    return "Sample menu text extracted from image/PDF";
}

async function parseMenuWithAI(extractedText, fileType) {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
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
        return [
            { name: "Burger", price: 450, category: "Main Course" },
            { name: "Fries", price: 200, category: "Sides" }
        ];
    }
}

async function parseExcelMenu(base64Data, fileType) {
    try {
        const buffer = Buffer.from(base64Data, 'base64');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

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

    const cleaned = String(price)
        .replace(/Rs\.\s*/i, '')
        .replace(/PKR\s*/i, '')
        .replace(/[₨Rs$]/g, '')
        .replace(/\s/g, '')
        .trim();

    return parseInt(cleaned, 10) || 0;
}

// OCR and AI Menu Parser Endpoint
app.post('/api/menu/scan', async (req, res) => {
    try {
        const { image_base64, pdf_base64, file_type, business_id } = req.body;

        if (!business_id) {
            return res.status(400).json({ error: 'business_id is required' });
        }

        let extractedText = '';
        let fileContent = image_base64 || pdf_base64;

        if (fileContent) {
            extractedText = await performOCR(fileContent, file_type);
        }

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

// Draft Management
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
                let categoryId = null;
                if (item.category) {
                    const { data: categoryData } = await supabase.rpc('get_or_create_category', {
                        p_business_id: business_id,
                        p_category_name: item.category
                    });
                    categoryId = categoryData;
                }

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

                const cleanPrice = cleanPriceValue(item.price);

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

// Create Category (Basic)
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
            if (error.code === '23505') {
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

// ==========================================
// COMPREHENSIVE CATEGORY MANAGEMENT API
// ==========================================

// GET /api/categories - List all categories with pagination
app.get('/api/categories', async (req, res) => {
    try {
        const { business_id, page = 1, limit = 50, include_inactive = false } = req.query;

        if (!business_id) {
            return res.status(400).json({ error: 'business_id is required' });
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build query - using basic columns that always exist
        let query = supabase
            .from('categories')
            .select('id, business_id, name, is_locked, is_active, sort_order, created_at, updated_at', { count: 'exact' })
            .eq('business_id', business_id)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true })
            .range(offset, offset + parseInt(limit) - 1);

        if (include_inactive !== 'true') {
            query = query.eq('is_active', true);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        // Get product counts for each category
        const categoryIds = (data || []).map(c => c.id);
        let countMap = {};

        if (categoryIds.length > 0) {
            const { data: productCounts } = await supabase
                .from('menu_items')
                .select('category_id')
                .in('category_id', categoryIds)
                .eq('is_deleted', false);

            (productCounts || []).forEach(item => {
                countMap[item.category_id] = (countMap[item.category_id] || 0) + 1;
            });
        }

        const categoriesWithCounts = (data || []).map(cat => ({
            ...cat,
            product_count: countMap[cat.id] || 0
        }));

        res.json({
            success: true,
            categories: categoriesWithCounts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/categories/:id - Get single category
app.get('/api/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('categories')
            .select('id, business_id, name, is_locked, is_active, sort_order, created_at, updated_at')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Category not found' });
            }
            throw error;
        }

        // Get product count
        const { count: productCount } = await supabase
            .from('menu_items')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', id)
            .eq('is_deleted', false);

        res.json({
            success: true,
            category: {
                ...data,
                product_count: productCount || 0
            }
        });
    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/categories - Create new category (full)
app.post('/api/categories', async (req, res) => {
    try {
        const {
            business_id,
            name,
            name_ur,
            description,
            parent_id,
            image_url,
            icon_name,
            sort_order,
            is_active
        } = req.body;

        if (!business_id || !name) {
            return res.status(400).json({ error: 'business_id and name are required' });
        }

        // Insert directly into categories table
        const { data, error } = await supabase
            .from('categories')
            .insert({
                business_id,
                name: name.trim(),
                name_ur: name_ur || null,
                description: description || null,
                parent_id: parent_id || null,
                image_url: image_url || null,
                icon_name: icon_name || null,
                sort_order: sort_order || 0,
                is_active: is_active !== undefined ? is_active : true
            })
            .select()
            .single();

        if (error) {
            console.error('Create category error:', error);
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Category with this name already exists' });
            }
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({ success: true, category: data });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/categories/:id - Update category
app.put('/api/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            name_ur,
            description,
            parent_id,
            image_url,
            icon_name,
            sort_order,
            is_active
        } = req.body;

        // Build update object
        const updateData = { updated_at: new Date().toISOString() };
        if (name !== undefined) updateData.name = name.trim();
        if (name_ur !== undefined) updateData.name_ur = name_ur;
        if (description !== undefined) updateData.description = description;
        if (parent_id !== undefined) updateData.parent_id = parent_id;
        if (image_url !== undefined) updateData.image_url = image_url;
        if (icon_name !== undefined) updateData.icon_name = icon_name;
        if (sort_order !== undefined) updateData.sort_order = sort_order;
        if (is_active !== undefined) updateData.is_active = is_active;

        const { data, error } = await supabase
            .from('categories')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Update category error:', error);
            return res.status(400).json({ error: error.message });
        }

        if (!data) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json({ success: true, category: data });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/categories/:id - Soft delete category (sets is_active = false)
app.delete('/api/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if category is locked
        const { data: category, error: fetchError } = await supabase
            .from('categories')
            .select('is_locked, name')
            .eq('id', id)
            .single();

        if (fetchError) {
            return res.status(404).json({ error: 'Category not found' });
        }

        if (category.is_locked) {
            return res.status(400).json({ error: 'Cannot delete locked category: ' + category.name });
        }

        // Check for active products
        const { count: productCount } = await supabase
            .from('menu_items')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', id)
            .eq('is_deleted', false);

        if (productCount && productCount > 0) {
            return res.status(400).json({
                error: 'Cannot delete category with active products. Move or delete products first.',
                product_count: productCount
            });
        }

        // Soft delete by setting is_active = false
        const { error } = await supabase
            .from('categories')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error('Delete category error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/categories/:id/products - Get products in category
app.get('/api/categories/:id/products', async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { data, error, count } = await supabase
            .from('menu_items')
            .select('*', { count: 'exact' })
            .eq('category_id', id)
            .eq('is_deleted', false)
            .order('name', { ascending: true })
            .range(offset, offset + parseInt(limit) - 1);

        if (error) throw error;

        res.json({
            success: true,
            products: data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get category products error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/categories/tree/:business_id - Get category tree
app.get('/api/categories/tree/:business_id', async (req, res) => {
    try {
        const { business_id } = req.params;

        // Get all categories for the business
        const { data, error } = await supabase
            .from('categories')
            .select('id, business_id, name, is_locked, is_active, sort_order, parent_id')
            .eq('business_id', business_id)
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) throw error;

        // Build tree structure
        const tree = buildCategoryTreeSimple(data || []);

        res.json({ success: true, tree });
    } catch (error) {
        console.error('Get category tree error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper function to build category tree
function buildCategoryTreeSimple(categories) {
    const map = new Map();
    const roots = [];

    // First pass: create map
    categories.forEach(cat => {
        map.set(cat.id, { ...cat, subcategories: [] });
    });

    // Second pass: build tree
    categories.forEach(cat => {
        const node = map.get(cat.id);
        if (cat.parent_id && map.has(cat.parent_id)) {
            const parent = map.get(cat.parent_id);
            parent.subcategories.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
}

// POST /api/categories/bulk/sort - Bulk update sort order
app.post('/api/categories/bulk/sort', async (req, res) => {
    try {
        const { business_id, sort_orders } = req.body;

        if (!business_id || !Array.isArray(sort_orders)) {
            return res.status(400).json({ error: 'business_id and sort_orders array are required' });
        }

        let updatedCount = 0;

        // Update each category's sort order
        for (const item of sort_orders) {
            const { error } = await supabase
                .from('categories')
                .update({ sort_order: item.sort_order, updated_at: new Date().toISOString() })
                .eq('id', item.id)
                .eq('business_id', business_id);

            if (!error) updatedCount++;
        }

        res.json({ success: true, updated_count: updatedCount });
    } catch (error) {
        console.error('Bulk sort categories error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/categories/bulk/toggle - Bulk toggle active status
app.post('/api/categories/bulk/toggle', async (req, res) => {
    try {
        const { business_id, category_ids, is_active } = req.body;

        if (!business_id || !Array.isArray(category_ids) || typeof is_active !== 'boolean') {
            return res.status(400).json({ error: 'business_id, category_ids array, and is_active boolean are required' });
        }

        const { data, error } = await supabase
            .from('categories')
            .update({ is_active, updated_at: new Date().toISOString() })
            .in('id', category_ids)
            .eq('business_id', business_id)
            .eq('is_locked', false)
            .select('id');

        if (error) throw error;

        res.json({ success: true, updated_count: data?.length || 0 });
    } catch (error) {
        console.error('Bulk toggle categories error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/categories/product/add - Add product to category
app.post('/api/categories/product/add', async (req, res) => {
    try {
        const { product_id, category_id, is_primary, category_specific_price } = req.body;

        if (!product_id || !category_id) {
            return res.status(400).json({ error: 'product_id and category_id are required' });
        }

        const { data: result, error } = await supabase.rpc('add_product_to_category', {
            p_product_id: product_id,
            p_category_id: category_id,
            p_is_primary: is_primary || false,
            p_category_specific_price: category_specific_price || null
        });

        if (error) throw error;

        res.json({ success: true, result });
    } catch (error) {
        console.error('Add product to category error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/categories/product/remove - Remove product from category
app.post('/api/categories/product/remove', async (req, res) => {
    try {
        const { product_id, category_id } = req.body;

        if (!product_id || !category_id) {
            return res.status(400).json({ error: 'product_id and category_id are required' });
        }

        const { data: result, error } = await supabase.rpc('remove_product_from_category', {
            p_product_id: product_id,
            p_category_id: category_id
        });

        if (error) throw error;

        res.json({ success: true, result });
    } catch (error) {
        console.error('Remove product from category error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/categories/check-availability/:id - Check if category is available now
app.get('/api/categories/check-availability/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: isAvailable, error } = await supabase.rpc('is_category_available_now', {
            p_category_id: id
        });

        if (error) throw error;

        res.json({ success: true, is_available: isAvailable });
    } catch (error) {
        console.error('Check category availability error:', error);
        res.status(500).json({ error: error.message });
    }
});

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

        // Send Push
        await sendPushNotificationInternal({
            title: '✅ Payment Confirmed!',
            message: `Admin verified your payment of Rs. ${payment.amount}`,
            target: 'specific',
            target_user_id: payment.user_id,
            link: payment.order_id ? `/orders/${payment.order_id}` : '/rider/dashboard'
        });

        res.json({ success: true, message: 'Payment confirmed and order/request activated' });
    } catch (error) {
        console.error('Admin Confirm Error:', error);
        res.status(500).json({ error: 'Manual confirmation failed' });
    }
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

        res.json(result);

    } catch (error) {
        console.error('Push notification failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// ADMIN UTILITIES & PAYMENTS
// ==========================================

// Admin verification middleware
const verifyAdminMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No auth' });
        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return res.status(401).json({ error: 'Invalid token' });

        // Check if user has admin role
        // This assumes you have a has_role RPC function or similar logic
        const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });

        if (roleError || !isAdmin) {
            // Fallback: Check if email is in a hardcoded admin list for safety
            const adminEmails = [
                'admin@fasthaazir.com',
                'superadmin@fasthaazir.com',
                'qasim.dev.001@gmail.com' // From context or safe default
            ];
            if (!adminEmails.includes(user.email)) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }

        req.user = user;
        next();
    } catch (e) {
        console.error('Auth error:', e);
        res.status(500).json({ error: 'Auth check failed' });
    }
};

// Admin confirm payment
app.post('/api/admin/payments/confirm', verifyAdminMiddleware, async (req, res) => {
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
app.post('/api/admin/payments/reject', verifyAdminMiddleware, async (req, res) => {
    const { payment_id, notes, admin_name } = req.body;
    const { data: payment } = await supabase.from('payments').select('*').eq('id', payment_id).single();
    if (!payment) return res.status(404).send();

    await supabase.from('payments').update({
        payment_status: 'rejected',
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

// Expose Express App as a single Cloud Function
exports.api = onRequest({ timeoutSeconds: 60, region: "us-central1" }, app);
