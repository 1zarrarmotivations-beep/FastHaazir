import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send,
    MessageSquare,
    X,
    Headphones,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    User,
    Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    useSupportTickets,
    useTicketMessages,
    useCreateTicket,
    useSendSupportMessage,
    useUpdateTicketStatus,
    SupportMessage,
    SupportTicket
} from '@/hooks/useSupport';
import { SUPPORT_FLOW, SupportStep } from '@/lib/supportFlow';
import { format } from 'date-fns';

interface SupportChatProps {
    onClose: () => void;
    orderId?: string;
}

export function SupportChat({ onClose, orderId }: SupportChatProps) {
    const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
    const [input, setInput] = useState('');
    const [currentStepId, setCurrentStepId] = useState('start');
    const scrollRef = useRef<HTMLDivElement>(null);

    const { data: tickets } = useSupportTickets();
    const { data: messages, isLoading: messagesLoading } = useTicketMessages(activeTicket?.id);
    const createTicket = useCreateTicket();
    const sendMessage = useSendSupportMessage();
    const updateStatus = useUpdateTicketStatus();

    // Scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleStartSupport = async (category: any = 'other') => {
        const ticket = await createTicket.mutateAsync({ category, orderId });
        setActiveTicket(ticket);
        setCurrentStepId('start');
    };

    const handleOptionClick = async (option: any) => {
        if (!activeTicket) return;

        // 1. Send user choice as a message
        await sendMessage.mutateAsync({
            ticketId: activeTicket.id,
            message: option.label
        });

        // 2. Process logic
        if (option.action === 'resolve') {
            await updateStatus.mutateAsync({
                ticketId: activeTicket.id,
                status: 'resolved'
            });
            await sendMessage.mutateAsync({
                ticketId: activeTicket.id,
                message: "Ticket marked as resolved. Have a great day!",
                isSystem: true
            });
            return;
        }

        if (option.action === 'escalate') {
            await updateStatus.mutateAsync({
                ticketId: activeTicket.id,
                status: 'escalated'
            });
            await sendMessage.mutateAsync({
                ticketId: activeTicket.id,
                message: "Requesting human agent takeover...",
                isSystem: true
            });
            // Further steps handled by admin
        }

        if (option.nextStepId) {
            const nextStep = SUPPORT_FLOW[option.nextStepId];
            if (nextStep) {
                setCurrentStepId(option.nextStepId);
                // Send system reply
                await sendMessage.mutateAsync({
                    ticketId: activeTicket.id,
                    message: nextStep.message,
                    isSystem: true
                });
            }
        }
    };

    const handleSendText = async () => {
        if (!input.trim() || !activeTicket) return;

        await sendMessage.mutateAsync({
            ticketId: activeTicket.id,
            message: input.trim()
        });
        setInput('');
    };

    const currentStep = SUPPORT_FLOW[currentStepId];

    return (
        <Card className="flex flex-col h-[600px] w-full max-w-[400px] shadow-2xl border-primary/20 bg-background/95 backdrop-blur-xl overflow-hidden rounded-3xl">
            {/* Header */}
            <div className="p-4 gradient-primary text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <Headphones className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold">FastHaazir Support</h3>
                        <p className="text-xs opacity-80">Online & Ready to Help</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onClose}>
                    <X className="w-5 h-5" />
                </Button>
            </div>

            <div className="flex-1 flex flex-col min-h-0 bg-muted/30">
                {!activeTicket ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                            <MessageSquare className="w-10 h-10 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-xl font-bold">How can we help?</h4>
                            <p className="text-sm text-muted-foreground">Select a category to start chatting with our support system.</p>
                        </div>
                        <div className="w-full space-y-2">
                            <Button className="w-full justify-between h-12 rounded-xl" variant="outline" onClick={() => handleStartSupport('order_late')}>
                                My order is late <ChevronRight className="w-4 h-4" />
                            </Button>
                            <Button className="w-full justify-between h-12 rounded-xl" variant="outline" onClick={() => handleStartSupport('payment_issue')}>
                                Payment or Refund <ChevronRight className="w-4 h-4" />
                            </Button>
                            <Button className="w-full justify-between h-12 rounded-xl" variant="outline" onClick={() => handleStartSupport('other')}>
                                Other concerns <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                        {tickets && tickets.length > 0 && (
                            <Button variant="ghost" className="text-primary text-sm" onClick={() => setActiveTicket(tickets[0])}>
                                View recent chats
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                <AnimatePresence>
                                    {messages?.map((msg) => (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            className={`flex ${msg.sender_id === null || msg.is_system ? 'justify-start' : 'justify-end'}`}
                                        >
                                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${msg.is_system
                                                ? 'bg-surface text-textPrimary border border-border'
                                                : msg.is_admin
                                                    ? 'bg-surface text-textPrimary border border-primary/20 rounded-tl-none'
                                                    : 'bg-primary text-white rounded-tr-none'
                                                }`}>
                                                <div className="flex items-center gap-2 mb-1 opacity-70">
                                                    {msg.is_system ? <Bot className="w-3 h-3" /> : (msg.is_admin ? <Headphones className="w-3 h-3" /> : <User className="w-3 h-3" />)}
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">
                                                        {msg.is_system ? 'Assistant' : (msg.is_admin ? 'Agent' : 'You')}
                                                    </span>
                                                </div>
                                                {msg.message}
                                                <p className="text-[9px] mt-1 opacity-50 text-right">
                                                    {format(new Date(msg.created_at), 'HH:mm')}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {/* Flow Options */}
                                {activeTicket.status === 'open' && currentStep?.options && currentStep.options.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex flex-col gap-2 p-2"
                                    >
                                        {currentStep.options.map((opt, idx) => (
                                            <Button
                                                key={idx}
                                                variant="secondary"
                                                size="sm"
                                                className="rounded-full bg-surface shadow-sm border border-border text-textPrimary hover:bg-primary hover:text-white transition-colors justify-start h-auto py-2 px-4"
                                                onClick={() => handleOptionClick(opt)}
                                            >
                                                {opt.label}
                                            </Button>
                                        ))}
                                    </motion.div>
                                )}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="p-4 border-t bg-background shrink-0">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Type your message..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendText()}
                                    className="rounded-full bg-muted border-none"
                                />
                                <Button
                                    size="icon"
                                    className="rounded-full shadow-lg gradient-primary text-white"
                                    onClick={handleSendText}
                                    disabled={!input.trim()}
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Card>
    );
}
