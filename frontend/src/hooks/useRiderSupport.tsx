import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffect } from 'react';
import { toast } from 'sonner';

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
}

export interface RiderSupportMessage {
    id: string;
    ticket_id: string;
    sender_id: string;
    sender_type: 'rider' | 'admin' | 'system';
    message: string;
    is_read: boolean;
    created_at: string;
}

// Get rider profile by user_id
const getRiderByUserId = async (userId: string): Promise<{ id: string } | null> => {
    const { data, error } = await supabase
        .from('riders')
        .select('id')
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error('Error fetching rider:', error);
        return null;
    }
    return data;
};

export const useRiderSupportTickets = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: ['rider-support-tickets', user?.id],
        queryFn: async () => {
            if (!user) throw new Error('Not authenticated');

            const rider = await getRiderByUserId(user.id);
            if (!rider) throw new Error('Rider profile not found');

            const { data, error } = await supabase
                .from('rider_support_tickets')
                .select('*')
                .eq('rider_id', rider.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching rider tickets:', error);
                throw error;
            }
            return data as RiderSupportTicket[];
        },
        enabled: !!user?.id,
    });
};

export const useRiderTicketMessages = (ticketId?: string) => {
    return useQuery({
        queryKey: ['rider-support-messages', ticketId],
        queryFn: async () => {
            if (!ticketId) return [];

            const { data, error } = await supabase
                .from('rider_support_messages')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching messages:', error);
                throw error;
            }
            return data as RiderSupportMessage[];
        },
        enabled: !!ticketId,
        refetchInterval: 2000, // Poll every 2 seconds for real-time updates
    });
};

export const useCreateRiderTicket = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ subject, category, priority = 'medium' }: {
            subject: string;
            category: string;
            priority?: 'low' | 'medium' | 'high' | 'urgent';
        }) => {
            if (!user) throw new Error('Not authenticated');

            const rider = await getRiderByUserId(user.id);
            if (!rider) throw new Error('Rider profile not found');

            const { data, error } = await supabase
                .from('rider_support_tickets')
                .insert({
                    rider_id: rider.id,
                    subject,
                    category,
                    priority,
                    status: 'open'
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating ticket:', error);
                throw error;
            }
            return data as RiderSupportTicket;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rider-support-tickets'] });
            toast.success('Support ticket created');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create ticket');
        }
    });
};

export const useSendRiderSupportMessage = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
            if (!user) throw new Error('Not authenticated');

            const rider = await getRiderByUserId(user.id);
            if (!rider) throw new Error('Rider profile not found');

            const { data, error } = await supabase
                .from('rider_support_messages')
                .insert({
                    ticket_id: ticketId,
                    sender_id: user.id,
                    sender_type: 'rider',
                    message
                })
                .select()
                .single();

            if (error) {
                console.error('Error sending message:', error);
                throw error;
            }

            // Update ticket's last_message_at
            await supabase
                .from('rider_support_tickets')
                .update({ last_message_at: new Date().toISOString() })
                .eq('id', ticketId);

            return data as RiderSupportMessage;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['rider-support-messages', variables.ticketId]
            });
            queryClient.invalidateQueries({
                queryKey: ['rider-support-tickets']
            });
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to send message');
        }
    });
};

export const useUpdateRiderTicketStatus = () => {
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
                console.error('Error updating ticket:', error);
                throw error;
            }
            return data as RiderSupportTicket;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rider-support-tickets'] });
            toast.success('Ticket updated');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update ticket');
        }
    });
};

// Real-time subscription for messages
export const useRiderMessageSubscription = (ticketId: string, onMessage: (message: RiderSupportMessage) => void) => {
    useEffect(() => {
        if (!ticketId) return;

        const channel = supabase
            .channel(`rider-messages-${ticketId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'rider_support_messages',
                    filter: `ticket_id=eq.${ticketId}`
                },
                (payload) => {
                    onMessage(payload.new as RiderSupportMessage);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [ticketId, onMessage]);
};
