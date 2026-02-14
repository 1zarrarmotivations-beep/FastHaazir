import { supabase } from "@/integrations/supabase/client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL !== undefined
    ? import.meta.env.VITE_BACKEND_URL
    : (import.meta.env.DEV ? 'http://localhost:5000' : '');

export interface PaymentResponse {
    transaction_id: string;
    qr_url: string;
    payment_url: string;
    expires_in: number;
}

export const createOnlinePayment = async (orderId: string, amount: number, userId: string): Promise<PaymentResponse> => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/payments/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                order_id: orderId,
                user_id: userId,
                amount: amount
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Payment API Error:', response.status, errorText);
            throw new Error(`Payment creation failed (${response.status}): ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Create Payment Error:', error);
        throw error;
    }
};

export const verifyPayment = async (transactionId: string): Promise<{ status: string }> => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/payments/verify/${transactionId}`);
        if (!response.ok) throw new Error('Verification failed');
        return await response.json();
    } catch (error) {
        console.error('Verify Payment Error:', error);
        throw error;
    }
};

export const claimPayment = async (transactionId: string): Promise<{ success: boolean }> => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/payments/claim`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ transaction_id: transactionId }),
        });
        if (!response.ok) throw new Error('Claim failed');
        return await response.json();
    } catch (error) {
        console.error('Claim Payment Error:', error);
        throw error;
    }
};
