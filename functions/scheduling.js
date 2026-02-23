/**
 * Order Scheduling API Routes
 * FastHazir Backend - Express Router for Order Scheduling
 * 
 * Endpoints:
 * - Time Slot Management (CRUD)
 * - Order Scheduling
 * - Admin Functions
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://jqbwynomwwjhsebcicpm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Log API request
 */
function logRequest(endpoint, method, params = {}) {
    console.log(`[SCHEDULING API] ${method} ${endpoint}`, JSON.stringify(params));
}

/**
 * Format error response
 */
function formatError(error, statusCode = 500) {
    console.error(`[SCHEDULING ERROR]`, error.message);
    return {
        error: error.message,
        code: statusCode
    };
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(dateStr) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date);
}

/**
 * Check if user is admin
 */
async function isAdmin(userId) {
    try {
        const { data, error } = await supabase.rpc('has_role', {
            _user_id: userId,
            _role: 'admin'
        });

        if (error) {
            console.error('Admin check RPC error:', error);
            // Fallback to manual check if RPC fails
            const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .eq('role', 'admin')
                .single();
            return !!roleData;
        }
        return !!data;
    } catch (error) {
        console.error('Admin check error:', error);
        return false;
    }
}

/**
 * Get slot availability status
 */
async function getSlotAvailability(slotId, date) {
    try {
        const { data: slot, error } = await supabase
            .from('time_slots')
            .select('*')
            .eq('id', slotId)
            .eq('is_active', true)
            .single();

        if (error || !slot) {
            return { available: false, reason: 'Slot not found or inactive' };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        const maxDate = new Date(today);
        maxDate.setDate(maxDate.getDate() + slot.max_advance_days);

        if (targetDate < today) {
            return { available: false, reason: 'Cannot schedule for past dates' };
        }

        if (targetDate > maxDate) {
            return { available: false, reason: `Cannot advance book more than ${slot.max_advance_days} days` };
        }

        // Check minimum advance time
        if (targetDate.getTime() === today.getTime()) {
            const now = new Date();
            const slotStart = new Date(today);
            const [hours, minutes] = slot.start_time.split(':');
            slotStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            const minAdvanceMs = slot.min_advance_minutes * 60 * 1000;
            if (slotStart.getTime() - now.getTime() < minAdvanceMs) {
                return { available: false, reason: `Must book at least ${slot.min_advance_minutes} minutes in advance` };
            }
        }

        return { available: true, slot };
    } catch (error) {
        console.error('Slot availability check error:', error);
        return { available: false, reason: error.message };
    }
}

// ==========================================
// TIME SLOT MANAGEMENT
// ==========================================

/**
 * GET /api/time-slots
 * Get all active time slots
 */
router.get('/time-slots', async (req, res) => {
    try {
        logRequest('/time-slots', 'GET');

        const { data, error } = await supabase
            .from('time_slots')
            .select('*')
            .eq('is_active', true)
            .order('start_time', { ascending: true });

        if (error) throw error;

        res.json({
            success: true,
            time_slots: data
        });
    } catch (error) {
        res.status(500).json(formatError(error));
    }
});

/**
 * GET /api/time-slots/available
 * Get available slots for a specific date
 * Query params: date (YYYY-MM-DD)
 */
router.get('/time-slots/available', async (req, res) => {
    try {
        const { date } = req.query;

        logRequest('/time-slots/available', 'GET', { date });

        if (!date) {
            return res.status(400).json({
                success: false,
                error: 'Date parameter is required (format: YYYY-MM-DD)'
            });
        }

        if (!isValidDate(date)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format. Use YYYY-MM-DD'
            });
        }

        const { data: slots, error } = await supabase
            .from('time_slots')
            .select('*')
            .eq('is_active', true)
            .order('start_time', { ascending: true });

        if (error) throw error;

        // Filter based on availability
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        const availableSlots = slots.filter(slot => {
            const maxDate = new Date(today);
            maxDate.setDate(maxDate.getDate() + slot.max_advance_days);

            // Past date check
            if (targetDate < today) return false;

            // Future booking limit check
            if (targetDate > maxDate) return false;

            // Minimum advance time check
            if (targetDate.getTime() === today.getTime()) {
                const now = new Date();
                const slotStart = new Date(today);
                const [hours, minutes] = slot.start_time.split(':');
                slotStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);

                const minAdvanceMs = slot.min_advance_minutes * 60 * 1000;
                if (slotStart.getTime() - now.getTime() < minAdvanceMs) {
                    return false;
                }
            }

            return true;
        });

        res.json({
            success: true,
            date,
            available_slots: availableSlots,
            count: availableSlots.length
        });
    } catch (error) {
        res.status(500).json(formatError(error));
    }
});

/**
 * POST /api/time-slots
 * Create new time slot (admin only)
 */
router.post('/time-slots', async (req, res) => {
    try {
        const { name, start_time, end_time, slot_type, min_advance_minutes, max_advance_days, is_active, admin_user_id } = req.body;

        logRequest('/time-slots', 'POST', { name, start_time, end_time, slot_type });

        // Validate admin
        if (!admin_user_id) {
            return res.status(401).json({ success: false, error: 'Admin user ID is required' });
        }

        const adminStatus = await isAdmin(admin_user_id);
        if (!adminStatus) {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        // Validate required fields
        if (!name || !start_time || !end_time || !slot_type) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, start_time, end_time, slot_type'
            });
        }

        // Validate slot_type
        const validTypes = ['morning', 'afternoon', 'evening', 'night'];
        if (!validTypes.includes(slot_type)) {
            return res.status(400).json({
                success: false,
                error: `Invalid slot_type. Must be one of: ${validTypes.join(', ')}`
            });
        }

        const { data, error } = await supabase
            .from('time_slots')
            .insert({
                name,
                start_time,
                end_time,
                slot_type,
                min_advance_minutes: min_advance_minutes || 30,
                max_advance_days: max_advance_days || 7,
                is_active: is_active !== false
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                return res.status(409).json({ success: false, error: 'Time slot with this name already exists' });
            }
            throw error;
        }

        res.status(201).json({
            success: true,
            message: 'Time slot created successfully',
            time_slot: data
        });
    } catch (error) {
        res.status(500).json(formatError(error));
    }
});

/**
 * PUT /api/time-slots/:id
 * Update time slot (admin only)
 */
router.put('/time-slots/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, start_time, end_time, slot_type, min_advance_minutes, max_advance_days, is_active, admin_user_id } = req.body;

        logRequest(`/time-slots/${id}`, 'PUT', { name, start_time, end_time });

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid time slot ID' });
        }

        // Validate admin
        if (!admin_user_id) {
            return res.status(401).json({ success: false, error: 'Admin user ID is required' });
        }

        const adminStatus = await isAdmin(admin_user_id);
        if (!adminStatus) {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        // Build update object
        const updateData = {};
        if (name) updateData.name = name;
        if (start_time) updateData.start_time = start_time;
        if (end_time) updateData.end_time = end_time;
        if (slot_type) updateData.slot_type = slot_type;
        if (min_advance_minutes !== undefined) updateData.min_advance_minutes = min_advance_minutes;
        if (max_advance_days !== undefined) updateData.max_advance_days = max_advance_days;
        if (is_active !== undefined) updateData.is_active = is_active;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        const { data, error } = await supabase
            .from('time_slots')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // Not found
                return res.status(404).json({ success: false, error: 'Time slot not found' });
            }
            throw error;
        }

        res.json({
            success: true,
            message: 'Time slot updated successfully',
            time_slot: data
        });
    } catch (error) {
        res.status(500).json(formatError(error));
    }
});

/**
 * DELETE /api/time-slots/:id
 * Deactivate time slot (admin only)
 */
router.delete('/time-slots/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { admin_user_id } = req.query;

        logRequest(`/time-slots/${id}`, 'DELETE');

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid time slot ID' });
        }

        // Validate admin
        if (!admin_user_id) {
            return res.status(401).json({ success: false, error: 'Admin user ID is required' });
        }

        const adminStatus = await isAdmin(admin_user_id);
        if (!adminStatus) {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        // Soft delete - set is_active to false
        const { error } = await supabase
            .from('time_slots')
            .update({ is_active: false })
            .eq('id', id);

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Time slot not found' });
            }
            throw error;
        }

        res.json({
            success: true,
            message: 'Time slot deactivated successfully'
        });
    } catch (error) {
        res.status(500).json(formatError(error));
    }
});

// ==========================================
// ORDER SCHEDULING
// ==========================================

/**
 * POST /api/schedule-order
 * Schedule an existing order
 * Input: { order_id, scheduled_date, slot_id, notes }
 */
router.post('/schedule-order', async (req, res) => {
    try {
        const { order_id, scheduled_date, slot_id, notes, user_id } = req.body;

        logRequest('/schedule-order', 'POST', { order_id, scheduled_date, slot_id });

        // Validate required fields
        if (!order_id || !scheduled_date || !slot_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: order_id, scheduled_date, slot_id'
            });
        }

        if (!isValidUUID(order_id)) {
            return res.status(400).json({ success: false, error: 'Invalid order_id format' });
        }

        if (!isValidUUID(slot_id)) {
            return res.status(400).json({ success: false, error: 'Invalid slot_id format' });
        }

        if (!isValidDate(scheduled_date)) {
            return res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' });
        }

        // Check if order exists and belongs to user
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*, users!inner(email, phone)')
            .eq('id', order_id)
            .single();

        if (orderError || !order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        // Verify user owns the order (if user_id provided)
        if (user_id && order.user_id !== user_id) {
            return res.status(403).json({ success: false, error: 'Order does not belong to this user' });
        }

        // Check if order is already scheduled
        if (order.scheduling_status === 'scheduled') {
            return res.status(400).json({ success: false, error: 'Order is already scheduled' });
        }

        // Check slot availability
        const availability = await getSlotAvailability(slot_id, scheduled_date);
        if (!availability.available) {
            return res.status(400).json({ success: false, error: availability.reason });
        }

        // Create scheduled_datetime
        const [hours, minutes] = availability.slot.start_time.split(':');
        const scheduled_datetime = new Date(scheduled_date);
        scheduled_datetime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // Create scheduled_order record
        const { data: scheduledOrder, error: scheduleError } = await supabase
            .from('scheduled_orders')
            .insert({
                order_id,
                user_id: order.user_id,
                scheduled_date,
                slot_id,
                scheduled_datetime: scheduled_datetime.toISOString(),
                status: 'pending',
                notes
            })
            .select(`
                *,
                time_slots (
                    name,
                    start_time,
                    end_time,
                    slot_type
                )
            `)
            .single();

        if (scheduleError) throw scheduleError;

        // Update orders table
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                scheduled_datetime: scheduled_datetime.toISOString(),
                slot_id,
                scheduling_status: 'scheduled'
            })
            .eq('id', order_id);

        if (updateError) throw updateError;

        res.status(201).json({
            success: true,
            message: 'Order scheduled successfully',
            scheduled_order: {
                ...scheduledOrder,
                order_details: {
                    id: order.id,
                    total_amount: order.total_amount,
                    status: order.status,
                    delivery_address: order.delivery_address
                }
            }
        });
    } catch (error) {
        console.error('Schedule order error:', error);
        res.status(500).json(formatError(error));
    }
});

/**
 * GET /api/scheduled-orders
 * Get user's scheduled orders
 * Query params: status (optional), user_id
 */
router.get('/scheduled-orders', async (req, res) => {
    try {
        const { status, user_id } = req.query;

        logRequest('/scheduled-orders', 'GET', { status, user_id });

        if (!user_id) {
            return res.status(400).json({ success: false, error: 'user_id is required' });
        }

        if (!isValidUUID(user_id)) {
            return res.status(400).json({ success: false, error: 'Invalid user_id format' });
        }

        let query = supabase
            .from('scheduled_orders')
            .select(`
                *,
                time_slots (
                    name,
                    start_time,
                    end_time,
                    slot_type
                ),
                orders (
                    id,
                    total_amount,
                    status,
                    delivery_address,
                    created_at
                ),
                riders (
                    id,
                    name,
                    phone
                )
            `)
            .eq('user_id', user_id);

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query
            .order('scheduled_datetime', { ascending: true });

        if (error) throw error;

        res.json({
            success: true,
            scheduled_orders: data,
            count: data?.length || 0
        });
    } catch (error) {
        res.status(500).json(formatError(error));
    }
});

/**
 * GET /api/scheduled-orders/:id
 * Get specific scheduled order details
 */
router.get('/scheduled-orders/:id', async (req, res) => {
    try {
        const { id } = req.params;

        logRequest(`/scheduled-orders/${id}`, 'GET');

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid scheduled order ID' });
        }

        const { data, error } = await supabase
            .from('scheduled_orders')
            .select(`
                *,
                time_slots (
                    id,
                    name,
                    start_time,
                    end_time,
                    slot_type
                ),
                orders (
                    id,
                    total_amount,
                    status,
                    delivery_address,
                    created_at,
                    items
                ),
                riders (
                    id,
                    name,
                    phone,
                    vehicle_type
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Scheduled order not found' });
            }
            throw error;
        }

        res.json({
            success: true,
            scheduled_order: data
        });
    } catch (error) {
        res.status(500).json(formatError(error));
    }
});

/**
 * PUT /api/scheduled-orders/:id/cancel
 * Cancel a scheduled order
 */
router.put('/scheduled-orders/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        logRequest(`/scheduled-orders/${id}/cancel`, 'PUT', { user_id });

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid scheduled order ID' });
        }

        // Get scheduled order
        const { data: scheduledOrder, error: fetchError } = await supabase
            .from('scheduled_orders')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !scheduledOrder) {
            return res.status(404).json({ success: false, error: 'Scheduled order not found' });
        }

        // Verify ownership
        if (user_id && scheduledOrder.user_id !== user_id) {
            return res.status(403).json({ success: false, error: 'Not authorized to cancel this order' });
        }

        // Only allow cancellation if status is pending
        if (scheduledOrder.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Cannot cancel order with status '${scheduledOrder.status}'. Only pending orders can be cancelled.`
            });
        }

        // Update scheduled order status
        const { error: updateError } = await supabase
            .from('scheduled_orders')
            .update({ status: 'cancelled' })
            .eq('id', id);

        if (updateError) throw updateError;

        // Update orders table
        await supabase
            .from('orders')
            .update({ scheduling_status: 'cancelled' })
            .eq('id', scheduledOrder.order_id);

        res.json({
            success: true,
            message: 'Scheduled order cancelled successfully'
        });
    } catch (error) {
        res.status(500).json(formatError(error));
    }
});

/**
 * PUT /api/scheduled-orders/:id/reschedule
 * Reschedule an order
 * Input: { scheduled_date, slot_id }
 */
router.put('/scheduled-orders/:id/reschedule', async (req, res) => {
    try {
        const { id } = req.params;
        const { scheduled_date, slot_id, user_id } = req.body;

        logRequest(`/scheduled-orders/${id}/reschedule`, 'PUT', { scheduled_date, slot_id });

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid scheduled order ID' });
        }

        // Validate input
        if (!scheduled_date || !slot_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: scheduled_date, slot_id'
            });
        }

        if (!isValidUUID(slot_id)) {
            return res.status(400).json({ success: false, error: 'Invalid slot_id format' });
        }

        if (!isValidDate(scheduled_date)) {
            return res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' });
        }

        // Get scheduled order
        const { data: scheduledOrder, error: fetchError } = await supabase
            .from('scheduled_orders')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !scheduledOrder) {
            return res.status(404).json({ success: false, error: 'Scheduled order not found' });
        }

        // Verify ownership
        if (user_id && scheduledOrder.user_id !== user_id) {
            return res.status(403).json({ success: false, error: 'Not authorized to reschedule this order' });
        }

        // Only allow rescheduling if status is pending
        if (scheduledOrder.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Cannot reschedule order with status '${scheduledOrder.status}'. Only pending orders can be rescheduled.`
            });
        }

        // Check new slot availability
        const availability = await getSlotAvailability(slot_id, scheduled_date);
        if (!availability.available) {
            return res.status(400).json({ success: false, error: availability.reason });
        }

        // Create new scheduled_datetime
        const [hours, minutes] = availability.slot.start_time.split(':');
        const scheduled_datetime = new Date(scheduled_date);
        scheduled_datetime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // Update scheduled order
        const { data: updatedOrder, error: updateError } = await supabase
            .from('scheduled_orders')
            .update({
                scheduled_date,
                slot_id,
                scheduled_datetime: scheduled_datetime.toISOString()
            })
            .eq('id', id)
            .select(`
                *,
                time_slots (
                    name,
                    start_time,
                    end_time,
                    slot_type
                )
            `)
            .single();

        if (updateError) throw updateError;

        // Update orders table
        await supabase
            .from('orders')
            .update({
                scheduled_datetime: scheduled_datetime.toISOString(),
                slot_id
            })
            .eq('id', scheduledOrder.order_id);

        res.json({
            success: true,
            message: 'Order rescheduled successfully',
            scheduled_order: updatedOrder
        });
    } catch (error) {
        res.status(500).json(formatError(error));
    }
});

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

/**
 * GET /api/admin/scheduled-orders
 * Get all scheduled orders (with filters)
 * Query params: status, date_from, date_to, admin_user_id
 */
router.get('/admin/scheduled-orders', async (req, res) => {
    try {
        const { status, date_from, date_to, admin_user_id } = req.query;

        logRequest('/admin/scheduled-orders', 'GET', { status, date_from, date_to });

        // Validate admin
        if (!admin_user_id) {
            return res.status(401).json({ success: false, error: 'Admin user ID is required' });
        }

        const adminStatus = await isAdmin(admin_user_id);
        if (!adminStatus) {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        let query = supabase
            .from('scheduled_orders')
            .select(`
                *,
                time_slots (
                    name,
                    start_time,
                    end_time,
                    slot_type
                ),
                orders (
                    id,
                    total_amount,
                    status,
                    delivery_address,
                    created_at,
                    users (
                        id,
                        email,
                        phone
                    )
                ),
                riders (
                    id,
                    name,
                    phone
                )
            `);

        if (status) {
            query = query.eq('status', status);
        }

        if (date_from) {
            query = query.gte('scheduled_date', date_from);
        }

        if (date_to) {
            query = query.lte('scheduled_date', date_to);
        }

        const { data, error } = await query
            .order('scheduled_datetime', { ascending: true });

        if (error) throw error;

        res.json({
            success: true,
            scheduled_orders: data,
            count: data?.length || 0
        });
    } catch (error) {
        res.status(500).json(formatError(error));
    }
});

/**
 * GET /api/admin/scheduled-orders/pending-assignment
 * Get orders ready for rider assignment
 */
router.get('/admin/scheduled-orders/pending-assignment', async (req, res) => {
    try {
        const { admin_user_id } = req.query;

        logRequest('/admin/scheduled-orders/pending-assignment', 'GET');

        // Validate admin
        if (!admin_user_id) {
            return res.status(401).json({ success: false, error: 'Admin user ID is required' });
        }

        const adminStatus = await isAdmin(admin_user_id);
        if (!adminStatus) {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        // Get pending orders that are ready for assignment
        // These are orders where scheduled_datetime is approaching (within 30 minutes)
        const now = new Date();
        const threshold = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now

        const { data, error } = await supabase
            .from('scheduled_orders')
            .select(`
                *,
                time_slots (
                    name,
                    start_time,
                    end_time,
                    slot_type
                ),
                orders (
                    id,
                    total_amount,
                    status,
                    delivery_address,
                    created_at,
                    users (
                        id,
                        email,
                        phone
                    )
                )
            `)
            .eq('status', 'pending')
            .lte('scheduled_datetime', threshold.toISOString())
            .gte('scheduled_datetime', now.toISOString())
            .order('scheduled_datetime', { ascending: true });

        if (error) throw error;

        res.json({
            success: true,
            pending_assignment: data || [],
            count: data?.length || 0
        });
    } catch (error) {
        res.status(500).json(formatError(error));
    }
});

/**
 * POST /api/admin/scheduled-orders/:id/assign-rider
 * Manually assign rider
 */
router.post('/admin/scheduled-orders/:id/assign-rider', async (req, res) => {
    try {
        const { id } = req.params;
        const { rider_id, admin_user_id } = req.body;

        logRequest(`/admin/scheduled-orders/${id}/assign-rider`, 'POST', { rider_id });

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid scheduled order ID' });
        }

        if (!isValidUUID(rider_id)) {
            return res.status(400).json({ success: false, error: 'Invalid rider ID' });
        }

        // Validate admin
        if (!admin_user_id) {
            return res.status(401).json({ success: false, error: 'Admin user ID is required' });
        }

        const adminStatus = await isAdmin(admin_user_id);
        if (!adminStatus) {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        // Get scheduled order
        const { data: scheduledOrder, error: fetchError } = await supabase
            .from('scheduled_orders')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !scheduledOrder) {
            return res.status(404).json({ success: false, error: 'Scheduled order not found' });
        }

        // Verify rider exists
        const { data: rider, error: riderError } = await supabase
            .from('riders')
            .select('id, name, phone, status')
            .eq('id', rider_id)
            .single();

        if (riderError || !rider) {
            return res.status(404).json({ success: false, error: 'Rider not found' });
        }

        // Update scheduled order with rider assignment
        const { data: updatedOrder, error: updateError } = await supabase
            .from('scheduled_orders')
            .update({
                rider_id,
                assigned_at: new Date().toISOString(),
                status: 'assigned'
            })
            .eq('id', id)
            .select(`
                *,
                time_slots (
                    name,
                    start_time,
                    end_time
                ),
                riders (
                    id,
                    name,
                    phone
                )
            `)
            .single();

        if (updateError) throw updateError;

        // Update orders table
        await supabase
            .from('orders')
            .update({
                rider_id,
                status: 'assigned',
                scheduling_status: 'in_progress'
            })
            .eq('id', scheduledOrder.order_id);

        // Send notification to rider (if FCM available)
        try {
            const { data: riderToken } = await supabase
                .from('device_tokens')
                .select('device_token')
                .eq('user_id', rider.id)
                .single();

            if (riderToken?.device_token) {
                // Notification would be sent via FCM here
                console.log(`[NOTIFICATION] Would send assignment notification to rider ${rider.id}`);
            }
        } catch (notifError) {
            console.error('Rider notification error:', notifError);
        }

        res.json({
            success: true,
            message: 'Rider assigned successfully',
            scheduled_order: updatedOrder
        });
    } catch (error) {
        res.status(500).json(formatError(error));
    }
});

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;
