import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface NotificationSettings {
  id: string;
  user_id: string;
  order_updates: boolean;
  rider_messages: boolean;
  promotions: boolean;
  system_alerts: boolean;
  created_at: string;
  updated_at: string;
}

export const useNotificationSettings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notification-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      // Return default settings if none exist
      if (!data) {
        return {
          order_updates: true,
          rider_messages: true,
          promotions: true,
          system_alerts: true,
        } as Partial<NotificationSettings>;
      }
      
      return data as NotificationSettings;
    },
    enabled: !!user?.id,
  });
};

export const useUpsertNotificationSettings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (settings: {
      order_updates?: boolean;
      rider_messages?: boolean;
      promotions?: boolean;
      system_alerts?: boolean;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("notification_settings")
        .upsert(
          {
            user_id: user.id,
            ...settings,
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
    },
  });
};
