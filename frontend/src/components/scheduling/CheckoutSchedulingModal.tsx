import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Clock,
    ChevronLeft,
    CheckCircle2,
    Loader2,
    AlertCircle,
    CalendarDays,
    MessageSquare
} from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { DatePicker } from './DatePicker';
import { TimeSlotPicker } from './TimeSlotPicker';
import { useScheduling, TimeSlot } from '@/hooks/useScheduling';
import { toast } from 'sonner';

interface CheckoutSchedulingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScheduled: (scheduleData: {
        scheduledDate: string;
        slotId: string;
        slotName: string;
        scheduledDateTime: string;
        notes?: string;
    }) => void;
    orderId: string;
}

export const CheckoutSchedulingModal: React.FC<CheckoutSchedulingModalProps> = ({
    isOpen,
    onClose,
    onScheduled,
    orderId,
}) => {
    const [step, setStep] = useState<'date' | 'time' | 'confirm'>('date');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | undefined>();
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { scheduleOrder, isScheduling, scheduleError } = useScheduling();

    // Handle date selection
    const handleDateSelect = useCallback((date: Date) => {
        setSelectedDate(date);
        // Reset slot when date changes
        setSelectedSlot(undefined);
        setStep('time');
    }, []);

    // Handle slot selection
    const handleSlotSelect = useCallback((slot: TimeSlot) => {
        setSelectedSlot(slot);
        setStep('confirm');
    }, []);

    // Handle back navigation
    const handleBack = () => {
        if (step === 'confirm') {
            setStep('time');
        } else if (step === 'time') {
            setStep('date');
        }
    };

    // Handle confirmation and scheduling
    const handleConfirm = async () => {
        if (!selectedDate || !selectedSlot) return;

        setIsSubmitting(true);
        try {
            const scheduledDate = format(selectedDate, 'yyyy-MM-dd');

            // Create a promise-based schedule call
            await new Promise<void>((resolve, reject) => {
                scheduleOrder(
                    {
                        orderId,
                        scheduledDate,
                        slotId: selectedSlot.id,
                        notes: notes || undefined,
                    },
                    {
                        onSuccess: () => resolve(),
                        onError: (error) => reject(error),
                    }
                );
            });

            // Format the datetime for display
            const dateLabel = isToday(selectedDate)
                ? 'Today'
                : isTomorrow(selectedDate)
                    ? 'Tomorrow'
                    : format(selectedDate, 'EEEE, MMMM d, yyyy');

            const timeLabel = format(
                parseISO(`2000-01-01T${selectedSlot.start_time}`),
                'h:mm a'
            ) + ' - ' + format(
                parseISO(`2000-01-01T${selectedSlot.end_time}`),
                'h:mm a'
            );

            const scheduledDateTime = `${dateLabel} at ${timeLabel}`;

            // Return the scheduled data
            onScheduled({
                scheduledDate,
                slotId: selectedSlot.id,
                slotName: selectedSlot.name,
                scheduledDateTime,
                notes: notes || undefined,
            });

            // Reset form
            resetForm();
            toast.success('Order scheduled successfully!');
        } catch (error: any) {
            console.error('Failed to schedule order:', error);
            toast.error(error.message || 'Failed to schedule order. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reset form state
    const resetForm = () => {
        setStep('date');
        setSelectedDate(undefined);
        setSelectedSlot(undefined);
        setNotes('');
    };

    // Handle modal close
    const handleClose = () => {
        resetForm();
        onClose();
    };

    // Format selected datetime for display
    const formatSelectedDateTime = (): string => {
        if (!selectedDate || !selectedSlot) return '';

        const dateLabel = isToday(selectedDate)
            ? 'Today'
            : isTomorrow(selectedDate)
                ? 'Tomorrow'
                : format(selectedDate, 'EEEE, MMMM d, yyyy');

        const timeLabel = format(
            parseISO(`2000-01-01T${selectedSlot.start_time}`),
            'h:mm a'
        ) + ' - ' + format(
            parseISO(`2000-01-01T${selectedSlot.end_time}`),
            'h:mm a'
        );

        return `${dateLabel} at ${timeLabel}`;
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto rounded-3xl">
                <DialogHeader className="space-y-3">
                    <div className="flex items-center gap-3">
                        {step !== 'date' && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleBack}
                                className="h-8 w-8 rounded-full"
                            >
                                <ChevronLeft size={18} />
                            </Button>
                        )}
                        <div className="flex-1">
                            <DialogTitle className="text-xl font-black">
                                {step === 'date' && 'Select Delivery Date'}
                                {step === 'time' && 'Select Time Slot'}
                                {step === 'confirm' && 'Confirm Schedule'}
                            </DialogTitle>
                            <DialogDescription className="text-sm">
                                {step === 'date' && 'Choose when you want your order delivered'}
                                {step === 'time' && 'Pick a convenient time slot'}
                                {step === 'confirm' && 'Review your scheduled delivery'}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <AnimatePresence mode="wait">
                    {step === 'date' && (
                        <motion.div
                            key="date-step"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="py-4"
                        >
                            <Card className="border-none shadow-none">
                                <CardContent className="p-0">
                                    <DatePicker
                                        selectedDate={selectedDate}
                                        onDateSelect={handleDateSelect}
                                    />
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {step === 'time' && selectedDate && (
                        <motion.div
                            key="time-step"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="py-4"
                        >
                            <TimeSlotPicker
                                selectedDate={selectedDate}
                                selectedSlot={selectedSlot}
                                onSlotSelect={handleSlotSelect}
                            />
                        </motion.div>
                    )}

                    {step === 'confirm' && selectedDate && selectedSlot && (
                        <motion.div
                            key="confirm-step"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4 py-4"
                        >
                            {/* Schedule Summary Card */}
                            <Card className="bg-primary/5 border-primary/20">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-primary" />
                                        Scheduled Delivery
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <CalendarDays className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase text-textSecondary">Date</p>
                                            <p className="font-bold">
                                                {isToday(selectedDate) ? 'Today' :
                                                    isTomorrow(selectedDate) ? 'Tomorrow' :
                                                        format(selectedDate, 'EEEE, MMMM d, yyyy')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <Clock className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase text-textSecondary">Time Slot</p>
                                            <p className="font-bold">{selectedSlot.name}</p>
                                            <p className="text-sm text-textSecondary">
                                                {format(parseISO(`2000-01-01T${selectedSlot.start_time}`), 'h:mm a')} -
                                                {format(parseISO(`2000-01-01T${selectedSlot.end_time}`), 'h:mm a')}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Notes Field */}
                            <div className="space-y-2">
                                <Label htmlFor="notes" className="flex items-center gap-2 text-sm font-bold">
                                    <MessageSquare size={14} />
                                    Notes (Optional)
                                </Label>
                                <Textarea
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Any special instructions for delivery..."
                                    className="rounded-xl resize-none"
                                    rows={3}
                                />
                            </div>

                            {/* Error Display */}
                            {scheduleError && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                                    <AlertCircle size={16} />
                                    <span>{scheduleError.message}</span>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {step === 'confirm' && (
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={handleBack}
                            className="flex-1 rounded-xl"
                        >
                            Back
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={isSubmitting || isScheduling}
                            className="flex-1 rounded-xl"
                        >
                            {isSubmitting || isScheduling ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Scheduling...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Confirm Schedule
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default CheckoutSchedulingModal;
