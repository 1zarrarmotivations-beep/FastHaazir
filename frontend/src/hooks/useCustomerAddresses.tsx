import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface CustomerAddress {
  id: string;
  user_id: string;
  label: string;
  address_text: string;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const useCustomerAddresses = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["customer-addresses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CustomerAddress[];
    },
    enabled: !!user?.id,
  });
};

export const useDefaultAddress = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["default-address", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;
      return data as CustomerAddress | null;
    },
    enabled: !!user?.id,
  });
};

export const useCreateAddress = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (address: {
      label: string;
      address_text: string;
      lat?: number;
      lng?: number;
      is_default?: boolean;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("customer_addresses")
        .insert({
          user_id: user.id,
          ...address,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-addresses"] });
      queryClient.invalidateQueries({ queryKey: ["default-address"] });
    },
  });
};

export const useUpdateAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      label?: string;
      address_text?: string;
      lat?: number;
      lng?: number;
      is_default?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("customer_addresses")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-addresses"] });
      queryClient.invalidateQueries({ queryKey: ["default-address"] });
    },
  });
};

export const useDeleteAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("customer_addresses")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-addresses"] });
      queryClient.invalidateQueries({ queryKey: ["default-address"] });
    },
  });
};

export const useSetDefaultAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.rpc as any)('set_default_customer_address', {
        p_address_id: id
      });

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-addresses"] });
      queryClient.invalidateQueries({ queryKey: ["default-address"] });
    },
  });
};
