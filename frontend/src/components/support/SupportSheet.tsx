import React, { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SupportChat } from './SupportChat';
import { Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SupportSheetProps {
    orderId?: string;
    trigger?: React.ReactNode;
}

export function SupportSheet({ orderId, trigger }: SupportSheetProps) {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-primary/10 text-primary">
                        <Headphones className="w-5 h-5" />
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent side="bottom" className="p-0 h-[85vh] rounded-t-[32px] overflow-hidden border-none outline-none">
                <SupportChat onClose={() => setOpen(false)} orderId={orderId} />
            </SheetContent>
        </Sheet>
    );
}
