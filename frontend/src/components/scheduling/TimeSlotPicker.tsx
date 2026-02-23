import React, { useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Clock, Sun, Sunset, Moon, CloudMoon, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { format, isToday, addMinutes, parseISO } from 'date-fns';
import { TimeSlot, useScheduling } from '@/hooks/useScheduling';

interface TimeSlotPickerProps {
    selectedDate: Date | undefined;
    selectedSlot: TimeSlot | undefined;
    onSlotSelect: (slot: TimeSlot) => void;
    className?: string;
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
    selectedDate,
    selectedSlot,
    onSlotSelect,
    className,
}) => {
    const { useAvailableSlots } = useScheduling();

    const dateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;
    const { data: availableSlots, isLoading, error } = useAvailableSlots(dateString || '');

    // Get current time for "too soon" check
    const now = new Date();

    // Check if a slot is too soon to book (within min_advance_minutes)
    const isSlotTooSoon = (slot: TimeSlot): boolean => {
        if (!selectedDate || !isToday(selectedDate)) return false;

        const slotStart = parseISO(`2000-01-01T${slot.start_time}`);
        const minAdvanceTime = addMinutes(now, slot.min_advance_minutes);

        return slotStart <= minAdvanceTime;
    };

    // Get icon for slot type
    const getSlotIcon = (slotType: string) => {
        switch (slotType) {
            case 'morning':
                return <Sun className="h-4 w-4 text-yellow-500" />;
            case 'afternoon':
                return <Sunset className="h-4 w-4 text-orange-500" />;
            case 'evening':
                return <CloudMoon className="h-4 w-4 text-purple-500" />;
            case 'night':
                return <Moon className="h-4 w-4 text-indigo-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-500" />;
        }
    };

    // Format time range
    const formatTimeRange = (startTime: string, endTime: string): string => {
        try {
            const start = format(parseISO(`2000-01-01T${startTime}`), 'h:mm a');
            const end = format(parseISO(`2000-01-01T${endTime}`), 'h:mm a');
            return `${start} - ${end}`;
        } catch {
            return `${startTime} - ${endTime}`;
        }
    };

    // Group slots by type
    const groupedSlots = useMemo(() => {
        if (!availableSlots) return {};

        return availableSlots.reduce((groups: Record<string, TimeSlot[]>, slot) => {
            const type = slot.slot_type || 'other';
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(slot);
            return groups;
        }, {});
    }, [availableSlots]);

    // If no date selected
    if (!selectedDate) {
        return (
            <Card className={cn('w-full', className)}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Select Time Slot
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Please select a date first</p>
                        <p className="text-sm mt-1">Choose a date to see available time slots</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <Card className={cn('w-full', className)}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Select Time Slot
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Loading available slots...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Card className={cn('w-full', className)}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Select Time Slot
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-red-500">
                        <XCircle className="h-12 w-12 mx-auto mb-3" />
                        <p>Failed to load time slots</p>
                        <p className="text-sm mt-1">Please try again</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // No slots available
    if (!availableSlots || availableSlots.length === 0) {
        return (
            <Card className={cn('w-full', className)}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Select Time Slot
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <XCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No time slots available</p>
                        <p className="text-sm mt-1">Try selecting a different date</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn('w-full', className)}>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Select Time Slot
                </CardTitle>
                {isToday(selectedDate) && (
                    <p className="text-sm text-orange-600 dark:text-orange-400">
                        ⚠️ Same-day orders must be booked at least 30 minutes in advance
                    </p>
                )}
            </CardHeader>
            <CardContent>
                {/* Time Slots Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {availableSlots.map((slot) => {
                        const tooSoon = isSlotTooSoon(slot);
                        const isSelected = selectedSlot?.id === slot.id;

                        return (
                            <Button
                                key={slot.id}
                                variant={isSelected ? 'default' : 'outline'}
                                disabled={tooSoon}
                                onClick={() => onSlotSelect(slot)}
                                className={cn(
                                    'h-auto py-3 px-4 flex flex-col items-start justify-center gap-1 transition-all',
                                    isSelected && 'ring-2 ring-offset-2 ring-primary',
                                    tooSoon && 'opacity-50 cursor-not-allowed bg-muted'
                                )}
                            >
                                <div className="flex items-center gap-2 w-full">
                                    {getSlotIcon(slot.slot_type)}
                                    <span className="font-medium text-sm">{slot.name}</span>
                                    {isSelected && (
                                        <CheckCircle2 className="h-4 w-4 ml-auto" />
                                    )}
                                </div>
                                <span className={cn(
                                    'text-xs',
                                    tooSoon ? 'text-red-500' : 'text-muted-foreground'
                                )}>
                                    {tooSoon ? 'Too soon' : formatTimeRange(slot.start_time, slot.end_time)}
                                </span>
                                {tooSoon && (
                                    <span className="text-[10px] text-red-400">
                                        Min {slot.min_advance_minutes} min advance
                                    </span>
                                )}
                            </Button>
                        );
                    })}
                </div>

                {/* Selected Slot Summary */}
                {selectedSlot && (
                    <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <p className="text-sm text-muted-foreground">Selected:</p>
                        <div className="flex items-center gap-2 mt-1">
                            {getSlotIcon(selectedSlot.slot_type)}
                            <p className="font-medium">
                                {selectedSlot.name} • {formatTimeRange(selectedSlot.start_time, selectedSlot.end_time)}
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default TimeSlotPicker;
