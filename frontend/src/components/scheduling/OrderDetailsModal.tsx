import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, MapPin, User, Phone, ShoppingBag, XCircle, CalendarArrowDown } from 'lucide-react';
import { ScheduledOrder } from '@/hooks/useScheduling';

interface OrderDetailsModalProps {
    order: ScheduledOrder;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCancel: () => void;
    onReschedule: () => void;
}

// Status configuration
const statusConfig = {
    pending: {
        label: 'Pending',
        variant: 'secondary' as const,
        bgColor: 'bg-yellow-100 dark:bg-yellow-900',
    },
    processing: {
        label: 'Processing',
        variant: 'default' as const,
        bgColor: 'bg-blue-100 dark:bg-blue-900',
    },
    assigned: {
        label: 'Assigned',
        variant: 'default' as const,
        bgColor: 'bg-blue-100 dark:bg-blue-900',
    },
    completed: {
        label: 'Completed',
        variant: 'success' as const,
        bgColor: 'bg-green-100 dark:bg-green-900',
    },
    cancelled: {
        label: 'Cancelled',
        variant: 'destructive' as const,
        bgColor: 'bg-red-100 dark:bg-red-900',
    },
};

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
    order,
    open,
    onOpenChange,
    onCancel,
    onReschedule,
}) => {
    const status = statusConfig[order.status] || statusConfig.pending;
    const isPending = order.status === 'pending';

    const scheduledDate = new Date(order.scheduled_date);
    const formattedDate = scheduledDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Scheduled Order Details
                    </DialogTitle>
                    <DialogDescription>
                        Order scheduled for {formattedDate}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Status Badge */}
                    <div className="flex items-center justify-center">
                        <Badge variant={status.variant} className={`${status.bgColor} px-4 py-1`}>
                            {status.label}
                        </Badge>
                    </div>

                    <Separator />

                    {/* Scheduled Date & Time */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Scheduled Time
                        </h4>
                        <div className="p-3 rounded-lg bg-muted/50">
                            <p className="font-medium">{formattedDate}</p>
                            <p className="text-sm text-muted-foreground">
                                {order.time_slots?.name} ({order.time_slots?.start_time} - {order.time_slots?.end_time})
                            </p>
                        </div>
                    </div>

                    <Separator />

                    {/* Order Info */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4" />
                            Order Information
                        </h4>
                        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Order ID</span>
                                <span className="font-mono text-sm">{order.order_id.slice(0, 8)}...</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Business</span>
                                <span className="font-medium">{order.orders?.businesses?.name || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Order Status</span>
                                <span className="font-medium capitalize">{order.orders?.status || 'N/A'}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between text-lg">
                                <span className="font-semibold">Total</span>
                                <span className="font-bold text-primary">
                                    Rs. {order.orders?.total?.toLocaleString() || '0'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Rider Info (if assigned) */}
                    {order.rider_id && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Assigned Rider
                                </h4>
                                <div className="p-3 rounded-lg bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                            <User className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Rider Assigned</p>
                                            <p className="text-sm text-muted-foreground">View in order details</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Notes */}
                    {order.notes && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-muted-foreground">Notes</h4>
                                <p className="text-sm p-3 rounded-lg bg-muted/50">{order.notes}</p>
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter className="flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                        Close
                    </Button>
                    {isPending && (
                        <>
                            <Button
                                variant="outline"
                                className="w-full sm:w-auto text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                                onClick={() => {
                                    onOpenChange(false);
                                    onReschedule();
                                }}
                            >
                                <CalendarArrowDown className="w-4 h-4 mr-2" />
                                Reschedule
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                onClick={() => {
                                    onOpenChange(false);
                                    onCancel();
                                }}
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancel Order
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default OrderDetailsModal;
