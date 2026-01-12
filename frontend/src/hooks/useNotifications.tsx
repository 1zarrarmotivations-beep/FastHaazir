import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'order' | 'chat' | 'system' | 'rider' | 'payment';
  is_read: boolean;
  order_id: string | null;
  rider_request_id: string | null;
  created_at: string;
}

// Notification sound as base64
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2MkZaQkIuJiISCgH58e3l4d3Z1dXV2d3h5e3x+gIOGiY2RlZqdn6CgoJ+fnp2cm5qZmJeWlZSUk5OTk5OTlJSVlpeYmZqbnJ2en5+goKCfn56dnJuamZiXlpWUk5KSkZGQkJCQkJCRkZKSk5SVlpeYmZqbnJ2en5+goA==';

// Play notification sound
const playNotificationSound = () => {
  try {
    const audio = new Audio(NOTIFICATION_SOUND);
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch (e) {
    console.error('Failed to play sound:', e);
  }
};

// Speak notification
const speakNotification = (message: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.1;
    utterance.pitch = 1.2;
    utterance.volume = 1;
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  }
};

// Fetch all notifications for user
export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const previousCount = useRef<number>(0);

  const query = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
  });

  // Real-time subscription with sound
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-realtime-sound')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New notification received:', payload);
          const newNotification = payload.new as Notification;
          
          // Play sound
          playNotificationSound();
          
          // Speak for important notifications
          if (newNotification.type === 'order' || newNotification.type === 'rider') {
            speakNotification(newNotification.title);
          }
          
          // Show toast
          toast.info(newNotification.title, {
            description: newNotification.message,
            duration: 5000,
          });
          
          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
          queryClient.invalidateQueries({ queryKey: ['unread-count', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
          queryClient.invalidateQueries({ queryKey: ['unread-count', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
};

// Get unread count with real-time updates
export const useUnreadCount = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['unread-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  });

  // Real-time subscription for count updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('unread-count-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-count', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
};

// Mark single notification as read
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-count', user?.id] });
    },
  });
};

// Mark all notifications as read
export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-count', user?.id] });
      toast.success('All notifications marked as read');
    },
  });
};

// Create notification helper (for use in other hooks)
// Uses secure RPC function with proper authorization checks
export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string = 'system',
  orderId?: string,
  riderRequestId?: string
) => {
  const { error } = await supabase.rpc('create_notification', {
    _user_id: userId,
    _title: title,
    _message: message,
    _type: type,
    _order_id: orderId || null,
    _rider_request_id: riderRequestId || null,
  });

  if (error) {
    console.error('Failed to create notification:', error);
  }
};
