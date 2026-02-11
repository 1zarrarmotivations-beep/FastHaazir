import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { SUPPORT_FLOW, SupportCategory } from '@/lib/supportFlow';

export interface SupportTicket {
    id: string;
    user_id: string;
    order_id: string | null;
    category: SupportCategory;
    status: 'open' | 'in_progress' | 'resolved';
    priority: 'low' | 'medium' | 'high';
    created_at: string;
}

export interface SupportMessage {
    id: string;
    ticket_id: string;
    sender_id: string | null;
    message: string;
    is_system: boolean;
    is_admin: boolean;
    created_at: string;
}

export const useSupportTickets = () => {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['support-tickets', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('support_tickets' as any)
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data as unknown) as SupportTicket[];
        },
        enabled: !!user?.id,
    });
};

export const useTicketMessages = (ticketId?: string) => {
    const queryClient = useQueryClient();

    // Polling for real-time simplicity, can be switched to PG Changes if needed
    return useQuery({
        queryKey: ['support-messages', ticketId],
        queryFn: async () => {
            if (!ticketId) return [];
            const { data, error } = await supabase
                .from('support_messages' as any)
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });
            if (error) throw error;
            return (data as unknown) as SupportMessage[];
        },
        enabled: !!ticketId,
        refetchInterval: 3000,
    });
};

export const useCreateTicket = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ category, orderId }: { category: SupportCategory, orderId?: string }) => {
            if (!user) throw new Error('Not authenticated');

            const { data: ticket, error: ticketError } = await (supabase
                .from('support_tickets' as any) as any)
                .insert({
                    user_id: user.id,
                    category,
                    order_id: orderId || null,
                    status: 'open'
                })
                .select()
                .single();

            if (ticketError) throw ticketError;

            // Add initial greeting after creating ticket
            const firstMessage = SUPPORT_FLOW.start.message;
            await (supabase.from('support_messages' as any) as any).insert({
                ticket_id: ticket.id,
                message: firstMessage,
                is_system: true
            });

            return ticket as SupportTicket;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
        },
    });
};

export const useSendSupportMessage = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ ticketId, message, isAdmin = false, isSystem = false }: {
            ticketId: string,
            message: string,
            isAdmin?: boolean,
            isSystem?: boolean
        }) => {
            const { data, error } = await (supabase
                .from('support_messages' as any) as any)
                .insert({
                    ticket_id: ticketId,
                    sender_id: user?.id || null,
                    message,
                    is_admin: isAdmin,
                    is_system: isSystem
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['support-messages', variables.ticketId] });
        },
    });
};

export const useUpdateTicketStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ ticketId, status }: { ticketId: string, status: string }) => {
            const { error } = await supabase
                .from('support_tickets' as any)
                .update({ status })
                .eq('id', ticketId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
            queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
        }
    });
};
