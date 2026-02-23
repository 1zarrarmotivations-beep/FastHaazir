/**
 * Firebase Scheduled Function - Schedule Processor
 * Auto-assigns riders to scheduled orders when their scheduled time arrives
 * 
 * Runs every minute via Firebase Scheduler
 * 
 * Configuration:
 * - Assignment window: 5 minutes before scheduled time (configurable)
 */

const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// ==========================================
// CONFIGURATION
// ==========================================

// Default configuration - can be overridden via environment variables
const CONFIG = {
    // Minutes before scheduled time to start assignment
    assignmentWindowMinutes: parseInt(process.env.ASSIGNMENT_WINDOW_MINUTES) || 5,
    // Maximum active orders a rider can have
    maxActiveOrders: parseInt(process.env.MAX_ACTIVE_ORDERS) || 3,
    // Minimum rating threshold for auto-assignment
    minRatingThreshold: parseFloat(process.env.MIN_RATING_THRESHOLD) || 3.0,
    // Admin email for notifications
    adminEmail: process.env.ADMIN_EMAIL || "admin@fasthaazir.com",
    // Supabase credentials
    supabaseUrl: process.env.SUPABASE_URL || "https://jqbwynomwwjhsebcicpm.supabase.co",
    supabaseKey: process.env.SUPABASE_SERVICE_KEY
};

// Initialize Supabase client
const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

/**
 * Get current timestamp in ISO format
 */
function getCurrentTimestamp() {
    return new Date().toISOString();
}

/**
 * Log with timestamp
 */
function log(message, data = null) {
    const timestamp = getCurrentTimestamp();
    if (data) {
        logger.info(`[${timestamp}] ${message}`, data);
    } else {
        logger.info(`[${timestamp}] ${message}`);
    }
}

/**
 * Log error with timestamp
 */
function logError(message, error) {
    const timestamp = getCurrentTimestamp();
    logger.error(`[${timestamp}] ${message}`, { error: error.message, stack: error.stack });
}

// ==========================================
// CORE FUNCTIONS
// ==========================================

/**
 * Find scheduled orders ready for assignment
 * Criteria:
 * - status is 'pending'
 * - scheduled_datetime is within the assignment window (now to +5 minutes)
 * - Order hasn't been cancelled
 */
async function findOrdersReadyForAssignment() {
    try {
        const now = new Date();
        const windowEnd = new Date(now.getTime() + CONFIG.assignmentWindowMinutes * 60 * 1000);

        log("Finding orders ready for assignment", {
            now: now.toISOString(),
            windowEnd: windowEnd.toISOString(),
            assignmentWindow: CONFIG.assignmentWindowMinutes
        });

        // Query scheduled_orders that are ready for assignment
        const { data: scheduledOrders, error } = await supabase
            .from("scheduled_orders")
            .select(`
                *,
                orders (
                    id,
                    status,
                    rider_id,
                    customer_id,
                    delivery_address,
                    latitude,
                    longitude,
                    business_id,
                    total_amount,
                    created_at
                )
            `)
            .eq("status", "pending")
            .lte("scheduled_datetime", windowEnd.toISOString())
            .gte("scheduled_datetime", now.toISOString())
            .order("scheduled_datetime", { ascending: true });

        if (error) {
            throw new Error(`Failed to fetch scheduled orders: ${error.message}`);
        }

        log(`Found ${scheduledOrders?.length || 0} orders ready for assignment`);
        return scheduledOrders || [];
    } catch (error) {
        logError("Error finding orders for assignment", error);
        throw error;
    }
}

/**
 * Find available riders for assignment
 * Criteria:
 * - is_active = true
 * - is_online = true (available)
 * - verification_status = 'verified'
 * - Has location data
 */
async function findAvailableRiders(deliveryLocation) {
    try {
        log("Finding available riders", { deliveryLocation });

        // First, get all active and online riders
        const { data: riders, error } = await supabase
            .from("riders")
            .select(`
                id,
                user_id,
                name,
                phone,
                email,
                latitude,
                longitude,
                is_active,
                is_online,
                verification_status,
                rating,
                total_ratings,
                current_orders_count
            `)
            .eq("is_active", true)
            .eq("is_online", true)
            .eq("verification_status", "verified")
            .not("latitude", "is", null)
            .not("longitude", "is", null);

        if (error) {
            throw new Error(`Failed to fetch riders: ${error.message}`);
        }

        if (!riders || riders.length === 0) {
            log("No available riders found");
            return [];
        }

        // Filter by current workload and rating
        const availableRiders = riders.filter(rider => {
            // Check current active orders (if field exists)
            const activeOrders = rider.current_orders_count || 0;
            if (activeOrders >= CONFIG.maxActiveOrders) {
                return false;
            }

            // Check rating threshold
            if (rider.rating && rider.rating < CONFIG.minRatingThreshold) {
                return false;
            }

            return true;
        });

        // Calculate distance for each rider and sort
        const ridersWithDistance = availableRiders.map(rider => {
            let distance = 999999; // Default high distance
            if (deliveryLocation.latitude && deliveryLocation.longitude) {
                distance = calculateDistance(
                    rider.latitude,
                    rider.longitude,
                    deliveryLocation.latitude,
                    deliveryLocation.longitude
                );
            }
            return {
                ...rider,
                distance
            };
        });

        // Sort by: distance (closest first), then by rating (highest first), then by workload (lowest first)
        ridersWithDistance.sort((a, b) => {
            // First by distance
            if (a.distance !== b.distance) {
                return a.distance - b.distance;
            }
            // Then by rating (higher is better)
            if (a.rating !== b.rating) {
                return (b.rating || 0) - (a.rating || 0);
            }
            // Then by current workload (lower is better)
            return (a.current_orders_count || 0) - (b.current_orders_count || 0);
        });

        log(`Found ${ridersWithDistance.length} available riders after filtering`);
        return ridersWithDistance;
    } catch (error) {
        logError("Error finding available riders", error);
        throw error;
    }
}

/**
 * Get current active orders count for a rider
 */
async function getRiderActiveOrdersCount(riderId) {
    try {
        const { count, error } = await supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("rider_id", riderId)
            .in("status", ["assigned", "picked_up", "on_the_way"]);

        if (error) {
            logger.warn(`Error getting rider orders count: ${error.message}`);
            return 0;
        }

        return count || 0;
    } catch (error) {
        logger.warn(`Error getting rider orders count: ${error.message}`);
        return 0;
    }
}

/**
 * Assign rider to order
 */
async function assignRiderToOrder(scheduledOrder, rider) {
    const orderId = scheduledOrder.order_id;
    const riderId = rider.id;

    log(`Assigning rider ${riderId} to order ${orderId}`);

    try {
        // Start a transaction-like update
        // 1. Update scheduled_orders table
        const { error: scheduledError } = await supabase
            .from("scheduled_orders")
            .update({
                rider_id: riderId,
                status: "assigned",
                updated_at: new Date().toISOString()
            })
            .eq("id", scheduledOrder.id);

        if (scheduledError) {
            throw new Error(`Failed to update scheduled_order: ${scheduledError.message}`);
        }

        // 2. Update orders table
        const { error: orderError } = await supabase
            .from("orders")
            .update({
                rider_id: riderId,
                status: "assigned",
                updated_at: new Date().toISOString()
            })
            .eq("id", orderId);

        if (orderError) {
            // Rollback scheduled_orders update
            await supabase
                .from("scheduled_orders")
                .update({
                    rider_id: null,
                    status: "pending",
                    updated_at: new Date().toISOString()
                })
                .eq("id", scheduledOrder.id);

            throw new Error(`Failed to update order: ${orderError.message}`);
        }

        // 3. Update rider's current_orders_count
        const { error: riderError } = await supabase
            .from("riders")
            .update({
                current_orders_count: (rider.current_orders_count || 0) + 1
            })
            .eq("id", riderId);

        if (riderError) {
            logger.warn(`Failed to update rider order count: ${riderError.message}`);
            // Don't fail the assignment for this
        }

        log(`Successfully assigned rider ${riderId} to order ${orderId}`);

        // 4. Send notification to rider (placeholder)
        await sendRiderNotification(rider, scheduledOrder);

        return { success: true };
    } catch (error) {
        logError(`Failed to assign rider to order ${orderId}`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Send notification to rider (placeholder)
 * In production, this would integrate with FCM or another push notification service
 */
async function sendRiderNotification(rider, scheduledOrder) {
    try {
        // Get order details
        const { data: order } = await supabase
            .from("orders")
            .select("*, businesses(name)")
            .eq("id", scheduledOrder.order_id)
            .single();

        // Create notification record (optional - if notification table exists)
        const notification = {
            rider_id: rider.id,
            type: "new_scheduled_order",
            title: "New Scheduled Order Assigned",
            message: `You have been assigned order #${scheduledOrder.order_id.slice(0, 8)}. Scheduled for ${new Date(scheduledOrder.scheduled_datetime).toLocaleString()}.`,
            data: JSON.stringify({
                order_id: scheduledOrder.order_id,
                scheduled_datetime: scheduledOrder.scheduled_datetime,
                delivery_address: order?.delivery_address
            }),
            created_at: new Date().toISOString(),
            read: false
        };

        // Try to insert notification (table might not exist)
        try {
            await supabase
                .from("rider_notifications")
                .insert(notification);
        } catch (e) {
            // Notification table doesn't exist or other error - skip
            logger.info("Could not create notification record", { error: e.message });
        }

        // TODO: Send FCM push notification to rider
        // This would require Firebase Cloud Messaging setup
        logger.info(`Notification sent to rider ${rider.id}`);

        return true;
    } catch (error) {
        logger.warn(`Failed to send notification to rider: ${error.message}`);
        return false;
    }
}

/**
 * Handle failed assignment - mark order and notify admin
 */
async function handleFailedAssignment(scheduledOrder, reason) {
    log(`Handling failed assignment for order ${scheduledOrder.order_id}: ${reason}`);

    try {
        // Update scheduled_orders with failed status
        const { error } = await supabase
            .from("scheduled_orders")
            .update({
                status: "assignment_failed",
                updated_at: new Date().toISOString()
            })
            .eq("id", scheduledOrder.id);

        if (error) {
            throw new Error(`Failed to update scheduled_order status: ${error.message}`);
        }

        // Log for admin review
        logger.warn(`Scheduled order ${scheduledOrder.order_id} failed assignment: ${reason}`, {
            order_id: scheduledOrder.order_id,
            scheduled_datetime: scheduledOrder.scheduled_datetime,
            reason: reason,
            timestamp: new Date().toISOString()
        });

        // TODO: Send admin notification (email/Slack/webhook)
        // For now, just log

        return true;
    } catch (error) {
        logError("Error handling failed assignment", error);
        return false;
    }
}

/**
 * Main processing function - runs every minute
 */
async function processScheduledOrders() {
    const results = {
        processed: 0,
        assigned: 0,
        failed: 0,
        skipped: 0,
        errors: []
    };

    log("Starting scheduled order processing");

    try {
        // Step 1: Find orders ready for assignment
        const readyOrders = await findOrdersReadyForAssignment();

        if (readyOrders.length === 0) {
            log("No orders ready for assignment this cycle");
            return results;
        }

        // Step 2: Process each order
        for (const scheduledOrder of readyOrders) {
            results.processed++;

            try {
                // Get order details
                const order = scheduledOrder.orders;

                // Skip if order is already assigned
                if (order.rider_id) {
                    log(`Order ${order.id} already has a rider, skipping`);
                    results.skipped++;
                    continue;
                }

                // Skip if order is cancelled
                if (order.status === "cancelled") {
                    log(`Order ${order.id} is cancelled, skipping`);
                    results.skipped++;
                    continue;
                }

                // Get delivery location
                const deliveryLocation = {
                    latitude: order.latitude,
                    longitude: order.longitude
                };

                // Step 3: Find available riders
                const availableRiders = await findAvailableRiders(deliveryLocation);

                if (availableRiders.length === 0) {
                    // No riders available - mark as failed
                    await handleFailedAssignment(scheduledOrder, "No available riders");
                    results.failed++;
                    continue;
                }

                // Step 4: Select best rider (first one after sorting)
                const bestRider = availableRiders[0];

                // Step 5: Assign rider to order
                const assignmentResult = await assignRiderToOrder(scheduledOrder, bestRider);

                if (assignmentResult.success) {
                    results.assigned++;
                    log(`Successfully assigned order ${order.id} to rider ${bestRider.id}`);
                } else {
                    results.failed++;
                    results.errors.push({
                        order_id: order.id,
                        error: assignmentResult.error
                    });
                }
            } catch (error) {
                results.failed++;
                results.errors.push({
                    order_id: scheduledOrder.order_id,
                    error: error.message
                });
                logError(`Error processing order ${scheduledOrder.order_id}`, error);
            }
        }

        log("Scheduled order processing completed", results);
        return results;
    } catch (error) {
        logError("Fatal error in scheduled order processing", error);
        results.errors.push({ error: error.message });
        throw error;
    }
}

// ==========================================
// FIREBASE SCHEDULED FUNCTION
// ==========================================

/**
 * HTTP-triggered function for manual testing
 * Also serves as the entry point for the scheduled function
 */
exports.scheduleProcessor = onRequest({
    timeoutSeconds: 120,
    region: "us-central1",
    memory: "512MB"
}, async (req, res) => {
    // Set CORS headers
    res.set("Access-Control-Allow-Origin", "*");

    if (req.method === "OPTIONS") {
        res.set("Access-Control-Allow-Methods", "POST");
        res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
        res.status(204).send("");
        return;
    }

    try {
        // Run the processor
        const results = await processScheduledOrders();

        res.status(200).json({
            success: true,
            message: "Scheduled order processing completed",
            results: results,
            timestamp: getCurrentTimestamp()
        });
    } catch (error) {
        logError("Schedule processor failed", error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: getCurrentTimestamp()
        });
    }
});

/**
 * Alternative: Export for Firebase Scheduler
 * Use this with Firebase Scheduled Functions:
 * 
 * exports.scheduledProcessor = functions.pubsub
 *     .schedule('every 1 minutes')
 *     .onRun(async (context) => {
 *         await processScheduledOrders();
 *     });
 */

// ==========================================
// FIRESTORE TRIGGER (Optional alternative)
// ==========================================

/**
 * If using Firestore, you could also use a scheduled function like:
 * 
 * const { onSchedule } = require("firebase-functions/v2/scheduler");
 * 
 * exports.scheduledOrderProcessor = onSchedule({
 *     schedule: "every 1 minutes",
 *     timeZone: "Asia/Karachi",
 *     region: "us-central1"
 * }, async (event) => {
 *     await processScheduledOrders();
 * });
 */

module.exports = {
    processScheduledOrders,
    findOrdersReadyForAssignment,
    findAvailableRiders,
    assignRiderToOrder,
    calculateDistance,
    CONFIG
};

// ==========================================
// FIREBASE SCHEDULED FUNCTION EXPORT
// ==========================================

/**
 * Firebase Scheduler function - runs every minute
 * This is the main scheduled function that gets deployed
 */
exports.processScheduledOrders = onSchedule({
    schedule: "every 1 minutes",
    timeZone: "Asia/Karachi", // Pakistan timezone
    region: "us-central1",
    memory: "512MB",
    timeout: "120s"
}, async (event) => {
    logger.info("Scheduled order processor triggered", { timestamp: new Date().toISOString() });
    try {
        const results = await processScheduledOrders();
        logger.info("Scheduled order processing completed", results);
    } catch (error) {
        logger.error("Scheduled order processing failed", { error: error.message });
    }
});
