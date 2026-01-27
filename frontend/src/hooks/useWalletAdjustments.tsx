import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WalletAdjustment {
  id: string;
  rider_id: string;
  amount: number;
  adjustment_type: 'cash_advance' | 'bonus' | 'deduction' | 'settlement' | 'correction';
  reason: string;
  linked_order_id: string | null;
  linked_rider_request_id: string | null;
  status: 'active' | 'settled' | 'cancelled';
  settled_at: string | null;
  settled_by: string | null;
  settled_notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  rider?: {
    name: string;
    phone: string;
    image: string | null;
  };
}

// Fetch rider's wallet adjustments
export const useRiderWalletAdjustments = (riderId?: string) => {
  return useQuery({
    queryKey: ['rider-wallet-adjustments', riderId],
    queryFn: async () => {
      if (!riderId) return [];

      const { data, error } = await supabase
        .from('rider_wallet_adjustments')
        .select('*')
        .eq('rider_id', riderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WalletAdjustment[];
    },
    enabled: !!riderId,
  });
};

// Fetch all wallet adjustments (admin)
export const useAllWalletAdjustments = () => {
  return useQuery({
    queryKey: ['all-wallet-adjustments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rider_wallet_adjustments')
        .select(`
          *,
          rider:riders(name, phone, image)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WalletAdjustment[];
    },
  });
};

// Create wallet adjustment (admin only)
export const useCreateWalletAdjustment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      riderId,
      amount,
      adjustmentType,
      reason,
      linkedOrderId,
      linkedRiderRequestId,
    }: {
      riderId: string;
      amount: number;
      adjustmentType: WalletAdjustment['adjustment_type'];
      reason: string;
      linkedOrderId?: string;
      linkedRiderRequestId?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user?.id) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('rider_wallet_adjustments')
        .insert({
          rider_id: riderId,
          amount,
          adjustment_type: adjustmentType,
          reason,
          linked_order_id: linkedOrderId || null,
          linked_rider_request_id: linkedRiderRequestId || null,
          created_by: userData.user.id,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rider-wallet-adjustments', variables.riderId] });
      queryClient.invalidateQueries({ queryKey: ['all-wallet-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['rider-wallet-summary', variables.riderId] });
      toast.success('Wallet adjustment created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create adjustment: ' + error.message);
    },
  });
};

// Settle wallet adjustment (admin only)
export const useSettleWalletAdjustment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      adjustmentId,
      settledNotes,
    }: {
      adjustmentId: string;
      settledNotes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('rider_wallet_adjustments')
        .update({
          status: 'settled',
          settled_at: new Date().toISOString(),
          settled_by: userData.user?.id,
          settled_notes: settledNotes,
        })
        .eq('id', adjustmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-wallet-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['rider-wallet-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['rider-wallet-summary'] });
      toast.success('Adjustment settled');
    },
    onError: (error: Error) => {
      toast.error('Failed to settle: ' + error.message);
    },
  });
};

// Cancel wallet adjustment (admin only)
export const useCancelWalletAdjustment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      adjustmentId,
      cancelNotes,
    }: {
      adjustmentId: string;
      cancelNotes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('rider_wallet_adjustments')
        .update({
          status: 'cancelled',
          settled_at: new Date().toISOString(),
          settled_by: userData.user?.id,
          settled_notes: cancelNotes,
        })
        .eq('id', adjustmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-wallet-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['rider-wallet-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['rider-wallet-summary'] });
      toast.success('Adjustment cancelled');
    },
    onError: (error: Error) => {
      toast.error('Failed to cancel: ' + error.message);
    },
  });
};

// Get rider wallet summary including adjustments
export const useRiderWalletSummary = (riderId?: string) => {
  return useQuery({
    queryKey: ['rider-wallet-summary', riderId],
    queryFn: async () => {
      if (!riderId) return null;

      // Get delivery earnings
      const { data: payments, error: paymentsError } = await supabase
        .from('rider_payments')
        .select('final_amount, status')
        .eq('rider_id', riderId);

      if (paymentsError) throw paymentsError;

      // Get wallet adjustments
      const { data: adjustments, error: adjustmentsError } = await supabase
        .from('rider_wallet_adjustments')
        .select('amount, adjustment_type, status')
        .eq('rider_id', riderId)
        .eq('status', 'active');

      if (adjustmentsError) throw adjustmentsError;

      // Get pending withdrawals
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select('amount, status')
        .eq('rider_id', riderId)
        .in('status', ['pending', 'approved']);

      if (withdrawalsError) throw withdrawalsError;

      // Calculate earnings
      const totalEarnings = payments?.reduce((sum, p) => sum + (p.final_amount || 0), 0) || 0;
      const completedEarnings = payments?.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.final_amount || 0), 0) || 0;
      const paidEarnings = payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.final_amount || 0), 0) || 0;

      // Calculate adjustments
      const cashAdvances = adjustments?.filter(a => a.adjustment_type === 'cash_advance').reduce((sum, a) => sum + a.amount, 0) || 0;
      const bonuses = adjustments?.filter(a => a.adjustment_type === 'bonus').reduce((sum, a) => sum + a.amount, 0) || 0;
      const deductions = adjustments?.filter(a => a.adjustment_type === 'deduction' || a.adjustment_type === 'settlement').reduce((sum, a) => sum + a.amount, 0) || 0;

      // Calculate pending withdrawals
      const pendingWithdrawals = withdrawals?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0;

      // Net balance = completed earnings + cash advances + bonuses - deductions - pending withdrawals
      const netBalance = completedEarnings + cashAdvances + bonuses - deductions - pendingWithdrawals;

      return {
        totalEarnings,
        completedEarnings,
        paidEarnings,
        cashAdvances,
        bonuses,
        deductions,
        pendingWithdrawals,
        netBalance: Math.max(0, netBalance),
      };
    },
    enabled: !!riderId,
  });
};
