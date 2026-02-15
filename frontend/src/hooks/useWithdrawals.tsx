import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WithdrawalRequest {
  id: string;
  rider_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  payment_method: string;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
  rider?: {
    name: string;
    phone: string;
    image: string | null;
  };
}

export interface CategoryPricing {
  id: string;
  category: string;
  base_fee: number;
  per_km_rate: number;
  min_payment: number;
  is_active: boolean;
}

// Fetch rider's withdrawal requests
export const useRiderWithdrawals = (riderId?: string) => {
  return useQuery({
    queryKey: ['rider-withdrawals', riderId],
    queryFn: async () => {
      if (!riderId) return [];

      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('rider_id', riderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WithdrawalRequest[];
    },
    enabled: !!riderId,
  });
};

// Fetch all withdrawal requests (admin)
export const useAllWithdrawals = () => {
  return useQuery({
    queryKey: ['all-withdrawals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select(`
          *,
          rider:riders(name, phone, image)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WithdrawalRequest[];
    },
  });
};

// Create withdrawal request (rider)
export const useCreateWithdrawal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      riderId,
      amount,
    }: {
      riderId: string;
      amount: number;
    }) => {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .insert({
          rider_id: riderId,
          amount,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rider-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['all-withdrawals'] });
      toast.success('Withdrawal request submitted');
    },
    onError: (error: Error) => {
      toast.error('Failed to submit request: ' + error.message);
    },
  });
};

// Process withdrawal request (admin)
export const useProcessWithdrawal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      withdrawalId,
      status,
      adminNotes,
      paymentMethod,
      paymentReference,
    }: {
      withdrawalId: string;
      status: 'approved' | 'rejected' | 'paid';
      adminNotes?: string;
      paymentMethod?: string;
      paymentReference?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('withdrawal_requests')
        .update({
          status,
          admin_notes: adminNotes,
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          processed_by: userData.user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', withdrawalId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['rider-withdrawals'] });
      toast.success('Withdrawal processed');
    },
    onError: (error: Error) => {
      toast.error('Failed to process: ' + error.message);
    },
  });
};

// Fetch category pricing
export const useCategoryPricing = () => {
  return useQuery({
    queryKey: ['category-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category_pricing')
        .select('*')
        .order('category');

      if (error) throw error;
      return data as CategoryPricing[];
    },
  });
};

// Update category pricing (admin)
export const useUpdateCategoryPricing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pricing: Partial<CategoryPricing> & { id: string }) => {
      const { data, error } = await supabase
        .from('category_pricing')
        .update({
          base_fee: pricing.base_fee,
          per_km_rate: pricing.per_km_rate,
          min_payment: pricing.min_payment,
          is_active: pricing.is_active,
        })
        .eq('id', pricing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-pricing'] });
      toast.success('Category pricing updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });
};

// Get rider's available balance for withdrawal
export const useRiderAvailableBalance = (riderId?: string) => {
  return useQuery({
    queryKey: ['rider-available-balance', riderId],
    queryFn: async () => {
      if (!riderId) return { available: 0, pending: 0, withdrawn: 0 };

      // Get total earnings marked as "completed" (ready for withdrawal)
      const { data: payments, error: paymentsError } = await supabase
        .from('rider_payments')
        .select('final_amount, status')
        .eq('rider_id', riderId)
        .eq('status', 'completed');

      if (paymentsError) throw paymentsError;

      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select('amount, status')
        .eq('rider_id', riderId)
        .neq('status', 'rejected'); // Get both pending, approved, and paid

      if (withdrawalsError) throw withdrawalsError;

      const totalCompleted = payments?.reduce((sum, p) => sum + (p.final_amount || 0), 0) || 0;

      const pendingWithdrawals = withdrawals?.filter(w => ['pending', 'approved'].includes(w.status)).reduce((sum, w) => sum + (w.amount || 0), 0) || 0;
      const paidWithdrawals = withdrawals?.filter(w => w.status === 'paid').reduce((sum, w) => sum + (w.amount || 0), 0) || 0;

      return {
        available: Math.max(0, totalCompleted - (pendingWithdrawals + paidWithdrawals)),
        pending: pendingWithdrawals,
        withdrawn: paidWithdrawals,
      };
    },
    enabled: !!riderId,
  });
};
