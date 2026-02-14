import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { SupportTicket, SupportMessage } from './useSupport';

export const useAdminSupportTickets = () => {
    return useQuery({
        queryKey: ['admin-support-tickets'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('admin_support_tickets_view' as any)
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data as unknown) as (SupportTicket & {
                user_name: string,
                user_phone: string,
                order_status: string,
                order_total: number
            })[];
        },
    });
};

export const useAdminJoinChat = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (ticketId: string) => {
            const { error } = await supabase
                .from('support_tickets' as any)
                .update({ status: 'in_progress' })
                .eq('id', ticketId);
            if (error) throw error;

            // Optional: send a message that admin joined
            await (supabase.from('support_messages' as any) as any).insert({
                ticket_id: ticketId,
                message: "Support agent joined the chat.",
                is_system: true,
                is_admin: true
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
        }
    });
};
