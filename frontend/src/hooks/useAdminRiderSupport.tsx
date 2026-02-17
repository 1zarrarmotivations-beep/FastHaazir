import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Rider Support Ticket Types
export interface RiderSupportTicket {
    id: string;
    rider_id: string;
    assigned_to: string | null;
    subject: string;
    category: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    metadata: Record<string, any>;
    last_message_at: string;
    created_at: string;
    updated_at: string;

    // Joined data
    rider_name?: string;
    rider_phone?: string;
}

export interface RiderSupportMessage {
    id: string;
    ticket_id: string;
    sender_id: string;
    sender_type: 'rider' | 'admin' | 'system';
    message: string;
    is_read: boolean;
    created_at: string;

    // Joined data
    sender_name?: string;
}

// Get all rider support tickets (admin view)
export const useAdminRiderSupportTickets = () => {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['admin-rider-support-tickets'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('rider_support_tickets')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching rider support tickets:', error);
                throw error;
            }
            return data as RiderSupportTicket[];
        },
        enabled: !!user,
    });
};

// Get messages for a specific rider support ticket
export const useAdminRiderTicketMessages = (ticketId?: string) => {
    return useQuery({
        queryKey: ['admin-rider-ticket-messages', ticketId],
        queryFn: async () => {
            if (!ticketId) return [];

            const { data, error } = await supabase
                .from('rider_support_messages')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching rider ticket messages:', error);
                throw error;
            }
            return data as RiderSupportMessage[];
        },
        enabled: !!ticketId,
        refetchInterval: 2000, // Poll every 2 seconds
    });
};

// Admin sends a message to rider support ticket
export const useAdminSendRiderSupportMessage = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('rider_support_messages')
                .insert({
                    ticket_id: ticketId,
                    sender_id: user.id,
                    sender_type: 'admin',
                    message
                })
                .select()
                .single();

            if (error) {
                console.error('Error sending admin message:', error);
                throw error;
            }

            // Update ticket's last_message_at
            await supabase
                .from('rider_support_tickets')
                .update({
                    last_message_at: new Date().toISOString(),
                    status: 'in_progress'
                })
                .eq('id', ticketId);

            return data as RiderSupportMessage;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['admin-rider-ticket-messages', variables.ticketId]
            });
            queryClient.invalidateQueries({
                queryKey: ['admin-rider-support-tickets']
            });
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to send message');
        }
    });
};

// Admin updates rider support ticket status
export const useAdminUpdateRiderTicketStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
            const { data, error } = await supabase
                .from('rider_support_tickets')
                .update({
                    status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', ticketId)
                .select()
                .single();

            if (error) {
                console.error('Error updating rider ticket status:', error);
                throw error;
            }
            return data as RiderSupportTicket;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-rider-support-tickets'] });
            toast.success('Ticket status updated');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update ticket');
        }
    });
};

// Assign rider ticket to admin
export const useAdminAssignRiderTicket = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ ticketId, adminId }: { ticketId: string; adminId: string }) => {
            const { data, error } = await supabase
                .from('rider_support_tickets')
                .update({
                    assigned_to: adminId,
                    status: 'in_progress'
                })
                .eq('id', ticketId)
                .select()
                .single();

            if (error) {
                console.error('Error assigning rider ticket:', error);
                throw error;
            }
            return data as RiderSupportTicket;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-rider-support-tickets'] });
            toast.success('Ticket assigned');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to assign ticket');
        }
    });
};

// Get rider info by ID
export const useRiderInfo = (riderId: string) => {
    return useQuery({
        queryKey: ['rider-info', riderId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('riders')
                .select('id, name, phone, vehicle_type, rating')
                .eq('id', riderId)
                .single();

            if (error) {
                console.error('Error fetching rider info:', error);
                return null;
            }
            return data;
        },
        enabled: !!riderId,
    });
};

// Mark messages as read
export const useMarkRiderMessagesAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ ticketId, senderId }: { ticketId: string; senderId: string }) => {
            const { error } = await supabase
                .from('rider_support_messages')
                .update({ is_read: true })
                .eq('ticket_id', ticketId)
                .neq('sender_id', senderId)
                .eq('is_read', false);

            if (error) {
                console.error('Error marking messages as read:', error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-rider-support-tickets'] });
        }
    });
};

// Get count of unread rider tickets
export const useUnreadRiderTicketsCount = () => {
    return useQuery({
        queryKey: ['unread-rider-tickets-count'],
        queryFn: async () => {
            const { count, error } = await supabase
                .from('rider_support_tickets')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'open');

            if (error) {
                console.error('Error counting unread rider tickets:', error);
                return 0;
            }
            return count || 0;
        },
        refetchInterval: 30000,
    });
};
