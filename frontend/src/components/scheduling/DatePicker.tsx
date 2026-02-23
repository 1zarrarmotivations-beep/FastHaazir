import React, { useState, useEffect, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays, isToday, isTomorrow, startOfDay } from 'date-fns';

interface DatePickerProps {
    selectedDate: Date | undefined;
    onDateSelect: (date: Date) => void;
    maxAdvanceDays?: number;
    disabledDates?: Date[];
    className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
    selectedDate,
    onDateSelect,
    maxAdvanceDays = 7,
    disabledDates = [],
    className,
}) => {
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [selected, setSelected] = useState<Date | undefined>(selectedDate);

    useEffect(() => {
        setSelected(selectedDate);
    }, [selectedDate]);

    // Generate quick date options (today and tomorrow)
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const maxDate = addDays(today, maxAdvanceDays);

    // Quick selection dates
    const quickDates = useMemo(() => {
        const dates: Date[] = [];
        for (let i = 0; i <= Math.min(2, maxAdvanceDays); i++) {
            dates.push(addDays(today, i));
        }
        return dates;
    }, [maxAdvanceDays]);

    const handleDateSelect = (date: Date | undefined) => {
        if (!date) return;
        setSelected(date);
        onDateSelect(date);
    };

    const isDateDisabled = (date: Date): boolean => {
        // Disable past dates
        if (date < today) return true;
        // Disable dates beyond max advance days
        if (date > maxDate) return true;
        // Disable custom disabled dates
        if (disabledDates.some(d => format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))) {
            return true;
        }
        return false;
    };

    const getQuickDateLabel = (date: Date): string => {
        if (isToday(date)) return 'Today';
        if (isTomorrow(date)) return 'Tomorrow';
        return format(date, 'EEE, MMM d');
    };

    return (
        <Card className={cn('w-full', className)}>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Select Date
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Quick Selection */}
                <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-2">Quick Select</p>
                    <div className="flex gap-2 flex-wrap">
                        {quickDates.map((date) => (
                            <Button
                                key={date.toISOString()}
                                variant={selected && format(selected, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                                    ? 'default'
                                    : 'outline'}
                                size="sm"
                                onClick={() => handleDateSelect(date)}
                                disabled={isDateDisabled(date)}
                                className={cn(
                                    'flex-1 min-w-[80px]',
                                    isToday(date) && 'border-green-500 border-2',
                                    isTomorrow(date) && 'border-blue-500 border-2'
                                )}
                            >
                                <span className="flex flex-col items-center">
                                    <span className="text-xs">{getQuickDateLabel(date)}</span>
                                    {isToday(date) && (
                                        <span className="text-[10px] opacity-75">Today</span>
                                    )}
                                </span>
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Calendar */}
                <div className="border rounded-lg p-2">
                    <Calendar
                        mode="single"
                        selected={selected}
                        onSelect={handleDateSelect}
                        disabled={isDateDisabled}
                        fromDate={today}
                        toDate={maxDate}
                        numberOfMonths={1}
                        className="w-full"
                        classNames={{
                            months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                            month: 'space-y-4 w-full',
                            caption: 'flex justify-center pt-1 relative items-center',
                            caption_label: 'text-sm font-medium',
                            nav: 'space-x-1 flex items-center justify-between',
                            nav_button: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                            nav_button_previous: 'absolute left-1',
                            nav_button_next: 'absolute right-1',
                            table: 'w-full border-collapse space-y-1',
                            head_row: 'flex',
                            head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
                            row: 'flex w-full mt-2',
                            cell: 'h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20',
                            day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent',
                            day_selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                            day_today: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 font-bold',
                            day_outside: 'text-muted-foreground opacity-50',
                            day_disabled: 'text-muted-foreground opacity-50 cursor-not-allowed',
                            day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
                            day_hidden: 'invisible',
                        }}
                        components={{
                            IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
                            IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
                        }}
                    />
                </div>

                {/* Selected Date Display */}
                {selected && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Selected:</p>
                        <p className="font-medium">
                            {isToday(selected) && <span className="text-green-600">Today</span>}
                            {isTomorrow(selected) && <span className="text-blue-600">Tomorrow</span>}
                            {!isToday(selected) && !isTomorrow(selected) && format(selected, 'EEEE, MMMM d, yyyy')}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default DatePicker;
