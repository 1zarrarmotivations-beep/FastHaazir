import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rescheduleOrder, fetchAvailableSlots, ScheduledOrder, TimeSlot } from '@/hooks/useScheduling';
import { toast } from 'sonner';
import { Calendar, Clock, RefreshCw, CalendarArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface RescheduleModalProps {
    order: ScheduledOrder;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

const RescheduleModal: React.FC<RescheduleModalProps> = ({
    order,
    open,
    onOpenChange,
    onConfirm,
}) => {
    const queryClient = useQueryClient();
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [isRescheduling, setIsRescheduling] = useState(false);

    // Get today's date in YYYY-MM-DD format for min date
    const today = new Date().toISOString().split('T')[0];

    // Generate next 7 days for date selection
    const availableDates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        return date.toISOString().split('T')[0];
    });

    // Fetch available slots for selected date
    const { data: availableSlots, isLoading: isLoadingSlots } = useQuery({
        queryKey: ['available-slots', selectedDate],
        queryFn: () => fetchAvailableSlots(selectedDate),
        enabled: !!selectedDate,
    });

    const handleReschedule = async () => {
        if (!selectedDate || !selectedSlot) {
            toast.error('Please select a new date and time slot');
            return;
        }

        setIsRescheduling(true);
        try {
            await rescheduleOrder(order.id, selectedDate, selectedSlot.id);
            toast.success('Order rescheduled successfully');
            queryClient.invalidateQueries({ queryKey: ['scheduled-orders'] });
            onConfirm();
            onOpenChange(false);
            // Reset state
            setSelectedDate('');
            setSelectedSlot(null);
        } catch (error) {
            console.error('Error rescheduling order:', error);
            toast.error('Failed to reschedule order. Please try again.');
        } finally {
            setIsRescheduling(false);
        }
    };

    const handleClose = () => {
        setSelectedDate('');
        setSelectedSlot(null);
        onOpenChange(false);
    };

    const originalDate = new Date(order.scheduled_date);
    const formattedOriginalDate = originalDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarArrowDown className="w-5 h-5" />
                        Reschedule Order
                    </DialogTitle>
                    <DialogDescription>
                        Select a new date and time for your scheduled order.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Original Schedule */}
                    <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Current Schedule</p>
                        <p className="font-medium">{formattedOriginalDate}</p>
                        <p className="text-sm text-muted-foreground">
                            {order.time_slots?.start_time} - {order.time_slots?.end_time}
                        </p>
                    </div>

                    {/* Date Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Select New Date
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {availableDates.map((date) => {
                                const dateObj = new Date(date);
                                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                                const dayNum = dateObj.getDate();
                                const isSelected = selectedDate === date;
                                const isToday = date === today;

                                return (
                                    <button
                                        key={date}
                                        onClick={() => {
                                            setSelectedDate(date);
                                            setSelectedSlot(null);
                                        }}
                                        className={cn(
                                            "p-2 rounded-lg text-center transition-all",
                                            isSelected
                                                ? "bg-primary text-white"
                                                : "bg-muted/50 hover:bg-muted",
                                            isToday && !isSelected && "border border-primary"
                                        )}
                                    >
                                        <p className="text-xs">{dayName}</p>
                                        <p className="font-semibold">{dayNum}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Time Slot Selection */}
                    {selectedDate && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Select Time Slot
                            </label>
                            {isLoadingSlots ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-12 w-full" />
                                    ))}
                                </div>
                            ) : availableSlots && availableSlots.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {availableSlots.map((slot) => {
                                        const isSelected = selectedSlot?.id === slot.id;
                                        return (
                                            <button
                                                key={slot.id}
                                                onClick={() => setSelectedSlot(slot)}
                                                disabled={!slot.is_available}
                                                className={cn(
                                                    "p-3 rounded-lg text-center transition-all",
                                                    isSelected
                                                        ? "bg-primary text-white"
                                                        : slot.is_available
                                                            ? "bg-muted/50 hover:bg-muted"
                                                            : "bg-muted/30 cursor-not-allowed opacity-50"
                                                )}
                                            >
                                                <p className="font-medium">{slot.name}</p>
                                                <p className="text-xs">
                                                    {slot.start_time} - {slot.end_time}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-4 rounded-lg bg-muted/50 text-center">
                                    <p className="text-muted-foreground">No available slots for this date</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Selected New Schedule Preview */}
                    {selectedDate && selectedSlot && (
                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                            <p className="text-xs text-primary mb-1">New Schedule</p>
                            <p className="font-medium">
                                {new Date(selectedDate).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </p>
                            <p className="text-sm text-primary">
                                {selectedSlot.name} ({selectedSlot.start_time} - {selectedSlot.end_time})
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleReschedule}
                        disabled={!selectedDate || !selectedSlot || isRescheduling}
                        className="w-full sm:w-auto"
                    >
                        {isRescheduling ? (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Rescheduling...
                            </>
                        ) : (
                            <>
                                <CalendarArrowDown className="w-4 h-4 mr-2" />
                                Confirm Reschedule
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default RescheduleModal;
