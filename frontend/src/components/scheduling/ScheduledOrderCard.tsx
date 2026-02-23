import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ChevronRight, MapPin, XCircle, CalendarArrowDown } from 'lucide-react';
import { ScheduledOrder } from '@/hooks/useScheduling';

interface ScheduledOrderCardProps {
    order: ScheduledOrder;
    index: number;
    onViewDetails: () => void;
    onCancel: () => void;
    onReschedule: () => void;
}

// Status configuration
const statusConfig = {
    pending: {
        label: 'Pending',
        variant: 'secondary' as const,
        bgColor: 'bg-yellow-100 dark:bg-yellow-900',
        textColor: 'text-yellow-800 dark:text-yellow-200',
        borderColor: 'border-yellow-300 dark:border-yellow-700',
    },
    processing: {
        label: 'Processing',
        variant: 'default' as const,
        bgColor: 'bg-blue-100 dark:bg-blue-900',
        textColor: 'text-blue-800 dark:text-blue-200',
        borderColor: 'border-blue-300 dark:border-blue-700',
    },
    assigned: {
        label: 'Assigned',
        variant: 'default' as const,
        bgColor: 'bg-blue-100 dark:bg-blue-900',
        textColor: 'text-blue-800 dark:text-blue-200',
        borderColor: 'border-blue-300 dark:border-blue-700',
    },
    completed: {
        label: 'Completed',
        variant: 'success' as const,
        bgColor: 'bg-green-100 dark:bg-green-900',
        textColor: 'text-green-800 dark:text-green-200',
        borderColor: 'border-green-300 dark:border-green-700',
    },
    cancelled: {
        label: 'Cancelled',
        variant: 'destructive' as const,
        bgColor: 'bg-red-100 dark:bg-red-900',
        textColor: 'text-red-800 dark:text-red-200',
        borderColor: 'border-red-300 dark:border-red-700',
    },
};

const ScheduledOrderCard: React.FC<ScheduledOrderCardProps> = ({
    order,
    index,
    onViewDetails,
    onCancel,
    onReschedule,
}) => {
    const status = statusConfig[order.status] || statusConfig.pending;
    const isPending = order.status === 'pending';
    const scheduledDate = new Date(order.scheduled_date);
    const formattedDate = scheduledDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <Card
                variant="elevated"
                className={`p-4 overflow-hidden border-l-4 ${status.borderColor}`}
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-primary" />
                            <h3 className="font-semibold">{formattedDate}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {order.time_slots?.name || 'Time Slot'}
                        </p>
                    </div>
                    <Badge variant={status.variant} className={status.bgColor}>
                        {status.label}
                    </Badge>
                </div>

                {/* Time Slot */}
                <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-muted/50">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                        {order.time_slots?.start_time && order.time_slots?.end_time
                            ? `${order.time_slots.start_time} - ${order.time_slots.end_time}`
                            : 'Scheduled delivery time'}
                    </span>
                </div>

                {/* Order Info */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="text-sm text-muted-foreground">
                            {order.orders?.businesses?.name || 'Business'}
                        </div>
                    </div>
                    <div className="text-primary font-semibold">
                        Rs. {order.orders?.total?.toLocaleString() || '0'}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={onViewDetails}
                    >
                        View Details
                    </Button>
                    {isPending && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                                onClick={onReschedule}
                            >
                                <CalendarArrowDown className="w-3 h-3 mr-1" />
                                Reschedule
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                onClick={onCancel}
                            >
                                <XCircle className="w-3 h-3 mr-1" />
                                Cancel
                            </Button>
                        </>
                    )}
                </div>
            </Card>
        </motion.div>
    );
};

export default ScheduledOrderCard;
