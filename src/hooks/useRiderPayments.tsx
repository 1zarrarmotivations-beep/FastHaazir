import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PaymentSettings {
  id: string;
  base_fee: number;
  per_km_rate: number;
  min_payment: number;
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

// Calculate distance using Haversine formula (fallback for client-side)
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
  // Multiply by 1.3 to approximate road distance
  return Math.round(R * c * 1.3 * 10) / 10;
};

// Calculate distance using edge function (road-based, more accurate)
export const calculateRoadDistance = async (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<{ distance_km: number; duration_minutes: number; method: string } | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('calculate-distance', {
      body: {
        origin_lat: originLat,
        origin_lng: originLng,
        destination_lat: destLat,
        destination_lng: destLng,
      },
    });

    if (error) {
      console.error('[Distance] Edge function error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[Distance] Failed to calculate road distance:', err);
    return null;
  }
};

// Calculate payment based on distance and settings
export const calculatePayment = (
  distanceKm: number,
  settings: PaymentSettings
): number => {
  const calculated = settings.base_fee + (distanceKm * settings.per_km_rate);
  return Math.max(Math.round(calculated), settings.min_payment);
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
      return data as PaymentSettings;
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
        .select('final_amount, status, distance_km')
        .eq('rider_id', riderId);

      if (error) throw error;

      const totalEarnings = data.reduce((sum, p) => sum + (p.final_amount || 0), 0);
      const paidEarnings = data.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.final_amount || 0), 0);
      const pendingEarnings = data.filter(p => p.status !== 'paid').reduce((sum, p) => sum + (p.final_amount || 0), 0);
      const totalDistance = data.reduce((sum, p) => sum + (p.distance_km || 0), 0);
      const totalDeliveries = data.length;

      return {
        totalEarnings,
        paidEarnings,
        pendingEarnings,
        totalDistance,
        totalDeliveries,
      };
    },
    enabled: !!riderId,
  });
};
