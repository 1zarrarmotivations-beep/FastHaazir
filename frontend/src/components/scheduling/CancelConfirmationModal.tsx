import React, { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelScheduledOrder, ScheduledOrder } from '@/hooks/useScheduling';
import { toast } from 'sonner';
import { XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface CancelConfirmationModalProps {
    order: ScheduledOrder;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

const CancelConfirmationModal: React.FC<CancelConfirmationModalProps> = ({
    order,
    open,
    onOpenChange,
    onConfirm,
}) => {
    const queryClient = useQueryClient();
    const [isCancelling, setIsCancelling] = useState(false);

    const scheduledDate = new Date(order.scheduled_date);
    const formattedDate = scheduledDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });

    // Calculate if refund is applicable (more than 2 hours before scheduled time)
    const now = new Date();
    const scheduledTime = new Date(order.scheduled_datetime);
    const hoursUntilScheduled = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isRefundable = hoursUntilScheduled > 2;

    const handleCancel = async () => {
        setIsCancelling(true);
        try {
            await cancelScheduledOrder(order.id);
            toast.success('Scheduled order cancelled successfully');
            queryClient.invalidateQueries({ queryKey: ['scheduled-orders'] });
            onConfirm();
            onOpenChange(false);
        } catch (error) {
            console.error('Error cancelling scheduled order:', error);
            toast.error('Failed to cancel scheduled order. Please try again.');
        } finally {
            setIsCancelling(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                        <XCircle className="w-5 h-5" />
                        Cancel Scheduled Order
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-4">
                            <p>
                                Are you sure you want to cancel this scheduled order? This action cannot be undone.
                            </p>

                            {/* Order Summary */}
                            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Date</span>
                                    <span className="font-medium">{formattedDate}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Time</span>
                                    <span className="font-medium">
                                        {order.time_slots?.start_time} - {order.time_slots?.end_time}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Amount</span>
                                    <span className="font-bold text-primary">
                                        Rs. {order.orders?.total?.toLocaleString() || '0'}
                                    </span>
                                </div>
                            </div>

                            {/* Refund Policy */}
                            <div className={`p-3 rounded-lg border ${isRefundable
                                ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                                : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'}`}>
                                <div className="flex items-start gap-2">
                                    {isRefundable ? (
                                        <RefreshCw className="w-4 h-4 text-green-600 mt-0.5" />
                                    ) : (
                                        <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                                    )}
                                    <div>
                                        <p className={`font-medium text-sm ${isRefundable
                                            ? 'text-green-800 dark:text-green-200'
                                            : 'text-yellow-800 dark:text-yellow-200'}`}>
                                            {isRefundable ? 'Refund Available' : 'No Refund Available'}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {isRefundable
                                                ? 'Your payment will be refunded to your original payment method within 5-7 business days.'
                                                : 'Cancellations less than 2 hours before scheduled time are not eligible for refund.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Warning */}
                            <div className="p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800">
                                <p className="text-sm text-red-800 dark:text-red-200">
                                    <strong>Warning:</strong> Please contact support if you have any issues with the cancellation or refund.
                                </p>
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                    <AlertDialogCancel className="w-full sm:w-auto">Keep Order</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleCancel}
                        disabled={isCancelling}
                        className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                    >
                        {isCancelling ? (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Cancelling...
                            </>
                        ) : (
                            <>
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancel Order
                            </>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default CancelConfirmationModal;
