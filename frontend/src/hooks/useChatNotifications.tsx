import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { createNotification } from './useNotifications';

// Global hook to listen for chat messages across all user's orders/requests
export const useChatNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    console.log('Setting up global chat notifications for user:', user.id);

    // Listen for all new chat messages
    const channel = supabase
      .channel('global-chat-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          console.log('Global chat notification:', payload);
          const newMessage = payload.new as {
            id: string;
            sender_id: string;
            sender_type: string;
            message: string;
            order_id: string | null;
            rider_request_id: string | null;
          };

          // Skip if it's our own message
          if (newMessage.sender_id === user.id) return;

          // Check if this message is relevant to the user
          // by checking if they are a participant in the order/request
          let isRelevant = false;

          if (newMessage.order_id) {
            const { data: order } = await supabase
              .from('orders')
              .select('customer_id, business_id, rider_id')
              .eq('id', newMessage.order_id)
              .maybeSingle();

            if (order) {
              // Check if user is the customer
              if (order.customer_id === user.id) isRelevant = true;
              
              // Check if user owns the business
              const { data: business } = await supabase
                .from('businesses')
                .select('owner_user_id')
                .eq('id', order.business_id || '')
                .maybeSingle();
              
              if (business?.owner_user_id === user.id) isRelevant = true;

              // Check if user is the rider
              const { data: rider } = await supabase
                .from('riders')
                .select('user_id')
                .eq('id', order.rider_id || '')
                .maybeSingle();
              
              if (rider?.user_id === user.id) isRelevant = true;
            }
          }

          if (newMessage.rider_request_id) {
            const { data: request } = await supabase
              .from('rider_requests')
              .select('customer_id, rider_id')
              .eq('id', newMessage.rider_request_id)
              .maybeSingle();

            if (request) {
              // Check if user is the customer
              if (request.customer_id === user.id) isRelevant = true;

              // Check if user is the rider
              const { data: rider } = await supabase
                .from('riders')
                .select('user_id')
                .eq('id', request.rider_id || '')
                .maybeSingle();
              
              if (rider?.user_id === user.id) isRelevant = true;
            }
          }

          if (isRelevant) {
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

            // Create database notification for the user
            await createNotification(
              user.id,
              `💬 New message from ${senderLabel}`,
              newMessage.message.length > 100 
                ? newMessage.message.substring(0, 100) + '...' 
                : newMessage.message,
              'chat',
              newMessage.order_id || undefined,
              newMessage.rider_request_id || undefined
            );

            // Invalidate relevant queries
            if (newMessage.order_id) {
              queryClient.invalidateQueries({ queryKey: ['chat-messages', newMessage.order_id, undefined] });
            }
            if (newMessage.rider_request_id) {
              queryClient.invalidateQueries({ queryKey: ['chat-messages', undefined, newMessage.rider_request_id] });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Global chat notifications subscription status:', status);
      });

    return () => {
      console.log('Removing global chat notifications channel');
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
};
