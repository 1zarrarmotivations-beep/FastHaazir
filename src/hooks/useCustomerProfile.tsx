import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface CustomerProfile {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  address: string | null;
  phone: string | null;
  phone_verified: boolean;
  profile_image: string | null;
  created_at: string;
  updated_at: string;
}

export const useCustomerProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["customer-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as CustomerProfile | null;
    },
    enabled: !!user?.id,
  });
};

export const useCreateCustomerProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (profile: { name?: string; email?: string; address?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("customer_profiles")
        .insert({
          user_id: user.id,
          ...profile,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
    },
  });
};

export const useUpdateCustomerProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (profile: { name?: string; email?: string; address?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("customer_profiles")
        .update(profile)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
    },
  });
};

export const useUpsertCustomerProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (profile: { 
      name?: string; 
      email?: string; 
      address?: string;
      phone?: string;
      phone_verified?: boolean;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("customer_profiles")
        .upsert({
          user_id: user.id,
          ...profile,
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
    },
  });
};
