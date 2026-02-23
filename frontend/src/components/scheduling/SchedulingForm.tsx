import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, Calendar, Clock, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { DatePicker } from './DatePicker';
import { TimeSlotPicker } from './TimeSlotPicker';
import { useScheduling, TimeSlot } from '@/hooks/useScheduling';

interface SchedulingFormProps {
    orderId: string;
    onScheduleSuccess?: (scheduledOrder: any) => void;
    onCancel?: () => void;
    className?: string;
}

export const SchedulingForm: React.FC<SchedulingFormProps> = ({
    orderId,
    onScheduleSuccess,
    onCancel,
    className,
}) => {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | undefined>();
    const [notes, setNotes] = useState('');
    const [showSummary, setShowSummary] = useState(false);

    const {
        scheduleOrder,
        isScheduling,
        scheduleError
    } = useScheduling();

    // Handle date selection
    const handleDateSelect = useCallback((date: Date) => {
        setSelectedDate(date);
        // Reset slot when date changes
        setSelectedSlot(undefined);
    }, []);

    // Handle slot selection
    const handleSlotSelect = useCallback((slot: TimeSlot) => {
        setSelectedSlot(slot);
    }, []);

    // Validate form
    const isValid = selectedDate && selectedSlot;

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

    // Handle form submission
    const handleSubmit = async () => {
        if (!isValid || !selectedDate) return;

        try {
            const scheduledDate = format(selectedDate, 'yyyy-MM-dd');

            await new Promise<void>((resolve, reject) => {
                scheduleOrder(
                    {
                        orderId,
                        scheduledDate,
                        slotId: selectedSlot!.id,
                        notes: notes || undefined,
                    },
                    {
                        onSuccess: (data) => {
                            onScheduleSuccess?.(data);
                            resolve();
                        },
                        onError: (error) => {
                            reject(error);
                        },
                    }
                );
            });
        } catch (error) {
            console.error('Failed to schedule order:', error);
        }
    };

    // Error display
    const renderError = () => {
        if (!scheduleError) return null;

        return (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">
                    {scheduleError instanceof Error ? scheduleError.message : 'Failed to schedule order'}
                </p>
            </div>
        );
    };

    // Summary view before confirmation
    if (showSummary && selectedDate && selectedSlot) {
        return (
            <Card className={cn('w-full', className)}>
                <CardHeader>
                    <CardTitle>Confirm Schedule</CardTitle>
                    <CardDescription>Please review your scheduled delivery</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Summary Details */}
                    <div className="space-y-3 p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-sm text-muted-foreground">Date</p>
                                <p className="font-medium">
                                    {isToday(selectedDate)
                                        ? 'Today'
                                        : isTomorrow(selectedDate)
                                            ? 'Tomorrow'
                                            : format(selectedDate, 'EEEE, MMMM d, yyyy')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-sm text-muted-foreground">Time Slot</p>
                                <p className="font-medium">
                                    {selectedSlot.name} ({format(
                                        parseISO(`2000-01-01T${selectedSlot.start_time}`),
                                        'h:mm a'
                                    )} - {format(
                                        parseISO(`2000-01-01T${selectedSlot.end_time}`),
                                        'h:mm a'
                                    )})
                                </p>
                            </div>
                        </div>

                        {notes && (
                            <div className="pt-2 border-t">
                                <p className="text-sm text-muted-foreground">Notes</p>
                                <p className="text-sm">{notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {renderError()}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowSummary(false)}
                            disabled={isScheduling}
                            className="flex-1"
                        >
                            Back
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isScheduling}
                            className="flex-1"
                        >
                            {isScheduling ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Scheduling...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Confirm
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Main form view
    return (
        <Card className={cn('w-full', className)}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Schedule Your Order
                </CardTitle>
                <CardDescription>
                    Select a date and time slot for your delivery
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Date Picker */}
                <DatePicker
                    selectedDate={selectedDate}
                    onDateSelect={handleDateSelect}
                    maxAdvanceDays={7}
                />

                {/* Time Slot Picker */}
                <TimeSlotPicker
                    selectedDate={selectedDate}
                    selectedSlot={selectedSlot}
                    onSlotSelect={handleSlotSelect}
                />

                {/* Notes Field */}
                <div className="space-y-2">
                    <Label htmlFor="notes" className="text-sm font-medium">
                        Additional Notes (Optional)
                    </Label>
                    <Textarea
                        id="notes"
                        placeholder="Any special instructions for your delivery..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="resize-none"
                    />
                </div>

                {/* Error */}
                {renderError()}

                {/* Selected Summary Preview */}
                {selectedDate && selectedSlot && (
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">Schedule Summary</p>
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>{formatSelectedDateTime()}</span>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    {onCancel && (
                        <Button
                            variant="outline"
                            onClick={onCancel}
                            disabled={isScheduling}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                    )}
                    <Button
                        onClick={() => setShowSummary(true)}
                        disabled={!isValid}
                        className={cn('flex-1', !onCancel && 'w-full')}
                    >
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default SchedulingForm;
            </CardContent >
        </Card >
    );
};

export default SchedulingForm;
