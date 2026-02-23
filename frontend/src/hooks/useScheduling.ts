import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Types for scheduling
export interface TimeSlot {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    slot_type: 'morning' | 'afternoon' | 'evening' | 'night';
    is_active: boolean;
    min_advance_minutes: number;
    max_advance_days: number;
    created_at?: string;
}

export interface AvailableSlot extends TimeSlot {
    is_available: boolean;
    reason?: string;
}

export interface ScheduledOrder {
    id: string;
    order_id: string;
    user_id: string;
    scheduled_date: string;
    slot_id: string;
    scheduled_datetime: string;
    status: 'pending' | 'processing' | 'assigned' | 'completed' | 'cancelled';
    rider_id?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    time_slots?: TimeSlot;
    orders?: {
        id: string;
        total: number;
        status: string;
        businesses?: {
            name: string;
            image: string | null;
        };
    };
}

export interface SlotAvailabilityResponse {
    success: boolean;
    date: string;
    available_slots: TimeSlot[];
    count: number;
}

export interface ScheduleOrderParams {
    orderId: string;
    scheduledDate: string;
    slotId: string;
    notes?: string;
}

// Fetch available time slots for a specific date
export const fetchAvailableSlots = async (date: string): Promise<AvailableSlot[]> => {
    // Use backend URL - fallback to localhost in development
    const backendUrl = import.meta.env.VITE_BACKEND_URL
        ? import.meta.env.VITE_BACKEND_URL
        : (import.meta.env.DEV ? 'http://localhost:5000' : '');

    const response = await fetch(
        `${backendUrl}/api/time-slots/available?date=${date}`,
        {
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to fetch available slots');
    }

    const data: SlotAvailabilityResponse = await response.json();
    return data.available_slots.map(slot => ({
        ...slot,
        is_available: true,
    }));
};

// Fetch all active time slots
export const fetchTimeSlots = async (): Promise<TimeSlot[]> => {
    const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .eq('is_active', true)
        .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
};

// Schedule an order
export const scheduleOrder = async (params: ScheduleOrderParams): Promise<ScheduledOrder> => {
    const { data: { user } } = await supabase.auth.getUser();

    // Use backend URL - fallback to localhost in development
    const backendUrl = import.meta.env.VITE_BACKEND_URL
        ? import.meta.env.VITE_BACKEND_URL
        : (import.meta.env.DEV ? 'http://localhost:5000' : '');

    const response = await fetch(
        `${backendUrl}/api/schedule-order`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                order_id: params.orderId,
                scheduled_date: params.scheduledDate,
                slot_id: params.slotId,
                notes: params.notes,
                user_id: user?.id,
            }),
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to schedule order');
    }

    const result = await response.json();
    return result.scheduled_order;
};

// Cancel a scheduled order
export const cancelScheduledOrder = async (scheduleId: string): Promise<ScheduledOrder> => {
    const { data: { user } } = await supabase.auth.getUser();

    // Use backend URL - fallback to localhost in development
    const backendUrl = import.meta.env.VITE_BACKEND_URL
        ? import.meta.env.VITE_BACKEND_URL
        : (import.meta.env.DEV ? 'http://localhost:5000' : '');

    const response = await fetch(
        `${backendUrl}/api/scheduled-orders/${scheduleId}/cancel`,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id: user?.id }),
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel scheduled order');
    }

    const result = await response.json();
    return result.scheduled_order;
};

// Reschedule an order
export const rescheduleOrder = async (
    scheduleId: string,
    scheduledDate: string,
    slotId: string
): Promise<ScheduledOrder> => {
    const { data: { user } } = await supabase.auth.getUser();

    // Use backend URL - fallback to localhost in development
    const backendUrl = import.meta.env.VITE_BACKEND_URL
        ? import.meta.env.VITE_BACKEND_URL
        : (import.meta.env.DEV ? 'http://localhost:5000' : '');

    const response = await fetch(
        `${backendUrl}/api/scheduled-orders/${scheduleId}/reschedule`,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                scheduled_date: scheduledDate,
                slot_id: slotId,
                user_id: user?.id,
            }),
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reschedule order');
    }

    const result = await response.json();
    return result.scheduled_order;
};

// Fetch user's scheduled orders
export const fetchScheduledOrders = async (userId: string): Promise<ScheduledOrder[]> => {
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
        total,
        status,
        businesses (
          name,
          image
        )
      )
    `)
        .eq('user_id', userId)
        .order('scheduled_datetime', { ascending: true });

    if (error) throw error;
    return data || [];
};

// Hook for scheduling functionality
export const useScheduling = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Query for available time slots
    const useAvailableSlots = (date: string) => {
        return useQuery({
            queryKey: ['available-slots', date],
            queryFn: () => fetchAvailableSlots(date),
            enabled: !!date,
            staleTime: 5 * 60 * 1000, // 5 minutes
        });
    };

    // Query for all time slots
    const useTimeSlots = () => {
        return useQuery({
            queryKey: ['time-slots'],
            queryFn: fetchTimeSlots,
            staleTime: 30 * 60 * 1000, // 30 minutes
        });
    };

    // Query for user's scheduled orders
    const useScheduledOrders = () => {
        return useQuery({
            queryKey: ['scheduled-orders', user?.id],
            queryFn: () => fetchScheduledOrders(user!.id),
            enabled: !!user,
        });
    };

    // Mutation for scheduling an order
    const scheduleOrderMutation = useMutation({
        mutationFn: scheduleOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scheduled-orders'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
    });

    // Mutation for canceling a scheduled order
    const cancelScheduledOrderMutation = useMutation({
        mutationFn: cancelScheduledOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scheduled-orders'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
    });

    // Mutation for rescheduling an order
    const rescheduleOrderMutation = useMutation({
        mutationFn: ({ scheduleId, scheduledDate, slotId }: {
            scheduleId: string;
            scheduledDate: string;
            slotId: string
        }) => rescheduleOrder(scheduleId, scheduledDate, slotId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scheduled-orders'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
    });

    return {
        useAvailableSlots,
        useTimeSlots,
        useScheduledOrders,
        scheduleOrder: scheduleOrderMutation.mutate,
        cancelScheduledOrder: cancelScheduledOrderMutation.mutate,
        rescheduleOrder: rescheduleOrderMutation.mutate,
        isScheduling: scheduleOrderMutation.isPending,
        isCancelling: cancelScheduledOrderMutation.isPending,
        isRescheduling: rescheduleOrderMutation.isPending,
        scheduleError: scheduleOrderMutation.error,
        cancelError: cancelScheduledOrderMutation.error,
        rescheduleError: rescheduleOrderMutation.error,
    };
};

export default useScheduling;
