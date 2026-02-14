import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PaymentSettings {
  id: string;
  base_fee: number;
  per_km_rate: number;
  min_payment: number;
  rider_base_earning: number;
  max_delivery_radius_km: number;
  min_order_value: number;
  is_active: boolean;
}


export interface RiderPayment {
  id: string;
  rider_id: string;
  order_id: string | null;
  rider_request_id: string | null;
  distance_km: number;
  base_fee: number;
  per_km_rate: number;
  calculated_amount: number;
  bonus: number;
  penalty: number;
  final_amount: number;
  status: 'pending' | 'completed' | 'paid';
  rider_lat: number | null;
  rider_lng: number | null;
  customer_lat: number | null;
  customer_lng: number | null;
  created_at: string;
  updated_at: string;
  rider?: {
    name: string;
    phone: string;
    image: string | null;
  };
}

// Calculate distance using Haversine formula
export const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

// Calculate payment based on distance and settings
// Calculate payment based on distance and settings - Returns detailed breakdown
export const calculatePayment = (
  distanceKm: number,
  settings: PaymentSettings
): {
  customerCharge: number;
  riderEarning: number;
  commission: number;
} => {
  // Customer Charge Calculation
  const rawCharge = settings.base_fee + (distanceKm * settings.per_km_rate);
  const customerCharge = Math.max(Math.round(rawCharge), settings.min_payment);

  // Rider Earning Calculation
  // Rider gets base earning + distance rate
  const rawRiderEarning = settings.rider_base_earning + (distanceKm * settings.per_km_rate);
  // Ensure rider earns at least a reasonable amount, but for now simple formula
  const riderEarning = Math.round(rawRiderEarning);

  // Commission is remainder
  const commission = Math.max(0, customerCharge - riderEarning);

  return {
    customerCharge,
    riderEarning,
    commission
  };
};


// Fetch payment settings
export const usePaymentSettings = () => {
  return useQuery({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rider_payment_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data as unknown as PaymentSettings;
    },
  });
};

// Fetch rider's payments
export const useRiderPayments = (riderId?: string) => {
  return useQuery({
    queryKey: ['rider-payments', riderId],
    queryFn: async () => {
      if (!riderId) return [];

      const { data, error } = await supabase
        .from('rider_payments')
        .select('*')
        .eq('rider_id', riderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RiderPayment[];
    },
    enabled: !!riderId,
  });
};

// Fetch all payments (admin)
export const useAllRiderPayments = () => {
  return useQuery({
    queryKey: ['all-rider-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rider_payments')
        .select(`
          *,
          rider:riders(name, phone, image)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RiderPayment[];
    },
  });
};

// Create payment when delivery is completed - uses secure RPC
export const useCreateRiderPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      riderRequestId,
    }: {
      orderId?: string;
      riderRequestId?: string;
    }) => {
      // Use secure server-side function for payment creation
      const { data, error } = await supabase.rpc('create_rider_payment', {
        _order_id: orderId || null,
        _rider_request_id: riderRequestId || null,
      });

      if (error) {
        // Handle specific errors gracefully
        if (error.message.includes('payment_already_exists')) {
          console.log('Payment already exists for this delivery');
          return null;
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rider-payments'] });
      queryClient.invalidateQueries({ queryKey: ['all-rider-payments'] });
    },
  });
};

// Update payment settings (admin)
export const useUpdatePaymentSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<PaymentSettings> & { id: string }) => {
      const { data, error } = await supabase
        .from('rider_payment_settings')
        .update({
          base_fee: settings.base_fee,
          per_km_rate: settings.per_km_rate,
          min_payment: settings.min_payment,
          max_delivery_radius_km: settings.max_delivery_radius_km,
          min_order_value: settings.min_order_value,
          rider_base_earning: settings.rider_base_earning,
        })
        .eq('id', settings.id)
        .select()
        .single();


      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-settings'] });
      toast.success('Payment settings updated');
    },
    onError: (error) => {
      toast.error('Failed to update settings: ' + error.message);
    },
  });
};

// Apply bonus/penalty to payment (admin)
export const useUpdatePaymentBonus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentId,
      bonus,
      penalty,
    }: {
      paymentId: string;
      bonus: number;
      penalty: number;
    }) => {
      // First get current payment
      const { data: current, error: fetchError } = await supabase
        .from('rider_payments')
        .select('calculated_amount')
        .eq('id', paymentId)
        .single();

      if (fetchError) throw fetchError;

      const finalAmount = current.calculated_amount + bonus - penalty;

      const { data, error } = await supabase
        .from('rider_payments')
        .update({
          bonus,
          penalty,
          final_amount: Math.max(0, finalAmount),
        })
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-rider-payments'] });
      queryClient.invalidateQueries({ queryKey: ['rider-payments'] });
      toast.success('Payment updated');
    },
  });
};

// Mark payment as completed/paid (admin)
export const useUpdatePaymentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentId,
      status,
    }: {
      paymentId: string;
      status: 'pending' | 'completed' | 'paid';
    }) => {
      const { data, error } = await supabase
        .from('rider_payments')
        .update({ status })
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-rider-payments'] });
      queryClient.invalidateQueries({ queryKey: ['rider-payments'] });
      toast.success('Payment status updated');
    },
  });
};

// Get rider earnings summary
export const useRiderEarningsSummary = (riderId?: string) => {
  return useQuery({
    queryKey: ['rider-earnings-summary', riderId],
    queryFn: async () => {
      if (!riderId) return null;

      const { data, error } = await supabase
        .from('rider_payments')
        .select('final_amount, status, distance_km, created_at')
        .eq('rider_id', riderId);

      if (error) throw error;

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const totalEarnings = data.reduce((sum, p) => sum + (p.final_amount || 0), 0);
      const todayEarnings = data
        .filter(p => new Date(p.created_at).getTime() >= startOfDay)
        .reduce((sum, p) => sum + (p.final_amount || 0), 0);

      const paidEarnings = data.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.final_amount || 0), 0);
      const pendingEarnings = data.filter(p => p.status !== 'paid').reduce((sum, p) => sum + (p.final_amount || 0), 0);
      const totalDistance = data.reduce((sum, p) => sum + (p.distance_km || 0), 0);
      const totalDeliveries = data.length;

      return {
        totalEarnings,
        todayEarnings,
        paidEarnings,
        pendingEarnings,
        totalDistance,
        totalDeliveries,
      };
    },
    enabled: !!riderId,
  });
};
