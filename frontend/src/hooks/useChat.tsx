import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  order_id: string | null;
  rider_request_id: string | null;
  sender_id: string;
  sender_type: 'customer' | 'business' | 'rider' | 'admin';
  message: string;
  message_type: 'text' | 'voice';
  voice_url: string | null;
  voice_duration: number | null;
  created_at: string;
  read_at: string | null;
}

export const useChatMessages = (orderId?: string, riderRequestId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const previousMessagesCount = useRef<number>(0);

  const query = useQuery({
    queryKey: ['chat-messages', orderId, riderRequestId],
    queryFn: async () => {
      let queryBuilder = supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (orderId) {
        queryBuilder = queryBuilder.eq('order_id', orderId);
      } else if (riderRequestId) {
        queryBuilder = queryBuilder.eq('rider_request_id', riderRequestId);
      } else {
        return [];
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!(orderId || riderRequestId),
    refetchInterval: 3000, // Faster polling for better responsiveness
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!orderId && !riderRequestId) return;

    const channelName = `chat-${orderId || riderRequestId}`;
    console.log('Setting up chat realtime channel:', channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: orderId 
            ? `order_id=eq.${orderId}`
            : `rider_request_id=eq.${riderRequestId}`
        },
        (payload) => {
          console.log('New chat message received:', payload);
          const newMessage = payload.new as ChatMessage;
          
          // Show notification if the message is from someone else
          if (user && newMessage.sender_id !== user.id) {
            // Play notification sound
            try {
              const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2MkZaQkIuJiISCgH58e3l4d3Z1dXV2d3h5e3x+gIOGiY2RlZqdn6CgoJ+fnp2cm5qZmJeWlZSUk5OTk5OTlJSVlpeYmZqbnJ2en5+goKCfn56dnJuamZiXlpWUk5KSkZGQkJCQkJCRkZKSk5SVlpeYmZqbnJ2en5+goA==');
              audio.volume = 0.5;
              audio.play().catch(() => {});
            } catch (e) {}
            
            const senderLabel = newMessage.sender_type === 'customer' ? 'Customer' 
              : newMessage.sender_type === 'business' ? 'Restaurant' 
              : 'Rider';
            
            toast.info(`💬 New message from ${senderLabel}`, {
              description: newMessage.message.length > 50 
                ? newMessage.message.substring(0, 50) + '...' 
                : newMessage.message,
              duration: 5000,
            });
          }
          
          queryClient.invalidateQueries({ queryKey: ['chat-messages', orderId, riderRequestId] });
        }
      )
      .subscribe((status) => {
        console.log('Chat channel subscription status:', status);
      });

    return () => {
      console.log('Removing chat channel:', channelName);
      supabase.removeChannel(channel);
    };
  }, [orderId, riderRequestId, queryClient, user]);

  return query;
};

export const useSendMessage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      riderRequestId,
      message,
      senderType,
    }: {
      orderId?: string;
      riderRequestId?: string;
      message: string;
      senderType: 'customer' | 'business' | 'rider';
    }) => {
      if (!user) throw new Error('Not authenticated');
      if (!message.trim()) throw new Error('Message cannot be empty');

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          order_id: orderId || null,
          rider_request_id: riderRequestId || null,
          sender_id: user.id,
          sender_type: senderType,
          message: message.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['chat-messages', variables.orderId, variables.riderRequestId] 
      });
    },
  });
};

export const useOrderParticipants = (orderId?: string) => {
  return useQuery({
    queryKey: ['order-participants', orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          *,
          business:businesses(id, name, owner_phone, owner_user_id),
          rider:riders(id, name, phone, user_id)
        `)
        .eq('id', orderId)
        .maybeSingle();

      if (error) throw error;
      return order;
    },
    enabled: !!orderId,
  });
};

export const useRiderRequestParticipants = (requestId?: string) => {
  return useQuery({
    queryKey: ['rider-request-participants', requestId],
    queryFn: async () => {
      if (!requestId) return null;

      const { data: request, error } = await supabase
        .from('rider_requests')
        .select(`
          *,
          rider:riders(id, name, phone, user_id)
        `)
        .eq('id', requestId)
        .maybeSingle();

      if (error) throw error;
      return request;
    },
    enabled: !!requestId,
  });
};
