import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    MessageSquare,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    Headphones,
    User,
    ExternalLink,
    Send,
    MoreVertical,
    Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    useAdminSupportTickets,
    useAdminJoinChat
} from '@/hooks/useAdminSupport';
import {
    useTicketMessages,
    useSendSupportMessage,
    useUpdateTicketStatus
} from '@/hooks/useSupport';
import { format } from 'date-fns';

export function SupportTicketsManager() {
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [search, setSearch] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const { data: tickets, isLoading } = useAdminSupportTickets();
    const joinChat = useAdminJoinChat();
    const { data: messages } = useTicketMessages(selectedTicketId || undefined);
    const sendMessage = useSendSupportMessage();
    const updateStatus = useUpdateTicketStatus();

    const selectedTicket = tickets?.find(t => t.id === selectedTicketId);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedTicketId) return;

        await sendMessage.mutateAsync({
            ticketId: selectedTicketId,
            message: replyText.trim(),
            isAdmin: true
        });
        setReplyText('');

        // Auto-join if not already in progress
        if (selectedTicket?.status === 'open') {
            joinChat.mutate(selectedTicketId);
        }
    };

    const filteredTickets = tickets?.filter(t =>
        t.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase()) ||
        t.id.includes(search)
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
            {/* Left List */}
            <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search tickets, customers..."
                        className="pl-9 bg-background shadow-sm rounded-xl"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="grid grid-cols-4 bg-muted/50 p-1 rounded-xl mb-4 shrink-0">
                        <TabsTrigger value="all" className="text-xs rounded-lg">All</TabsTrigger>
                        <TabsTrigger value="open" className="text-xs rounded-lg">Open</TabsTrigger>
                        <TabsTrigger value="active" className="text-xs rounded-lg">Active</TabsTrigger>
                        <TabsTrigger value="done" className="text-xs rounded-lg">Done</TabsTrigger>
                    </TabsList>

                    <ScrollArea className="flex-1">
                        <div className="space-y-3 pr-4">
                            {filteredTickets?.map((ticket) => (
                                <button
                                    key={ticket.id}
                                    onClick={() => setSelectedTicketId(ticket.id)}
                                    className={`w-full text-left p-4 rounded-2xl transition-all border ${selectedTicketId === ticket.id
                                        ? 'bg-primary/5 border-primary shadow-sm'
                                        : 'bg-background hover:bg-muted/50 border-border'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider rounded-md border-primary/20 bg-primary/5 text-primary">
                                            {ticket.category.replace('_', ' ')}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground">
                                            {format(new Date(ticket.created_at), 'MMM d, HH:mm')}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-foreground truncate">{ticket.user?.name}</h4>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                        Order: {ticket.order_id ? `#${ticket.order_id.slice(-6)}` : 'None'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-3">
                                        <div className={`w-2 h-2 rounded-full ${ticket.status === 'open' ? 'bg-amber-500 animate-pulse' :
                                            ticket.status === 'in_progress' ? 'bg-blue-500' : 'bg-emerald-500'
                                            }`} />
                                        <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                            {ticket.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </Tabs>
            </div>

            {/* Right Chat Area */}
            <div className="lg:col-span-8 flex flex-col h-full bg-background rounded-3xl border shadow-sm overflow-hidden">
                {selectedTicket ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-6 border-b flex items-center justify-between bg-muted/10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <User className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{selectedTicket.user?.name}</h3>
                                    <p className="text-sm text-muted-foreground">{selectedTicket.user?.phone}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedTicket.status !== 'resolved' && (
                                    <Button
                                        variant="outline"
                                        className="text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                                        onClick={() => updateStatus.mutate({ ticketId: selectedTicket.id, status: 'resolved' })}
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Resolved
                                    </Button>
                                )}
                                {selectedTicket.order_id && (
                                    <Button variant="ghost" size="icon">
                                        <ExternalLink className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <ScrollArea className="flex-1 p-6">
                            <div className="space-y-4 max-w-3xl mx-auto">
                                <AnimatePresence>
                                    {messages?.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] p-4 rounded-2xl ${msg.is_system
                                                ? 'bg-muted/50 text-muted-foreground text-center mx-auto text-xs py-2 w-full'
                                                : msg.is_admin
                                                    ? 'bg-primary text-primary-foreground rounded-tr-none shadow-md'
                                                    : 'bg-muted border border-border rounded-tl-none shadow-sm'
                                                }`}>
                                                {!msg.is_system && (
                                                    <div className="flex items-center gap-2 mb-1 opacity-70">
                                                        <span className="text-[9px] font-bold uppercase tracking-wider">
                                                            {msg.is_admin ? 'Agent (You)' : 'Customer'}
                                                        </span>
                                                    </div>
                                                )}
                                                <p className="text-sm leading-relaxed">{msg.message}</p>
                                                {!msg.is_system && (
                                                    <p className="text-[10px] mt-2 opacity-50 text-right">
                                                        {format(new Date(msg.created_at), 'HH:mm')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </AnimatePresence>
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>

                        {/* Input */}
                        <div className="p-6 border-t bg-muted/5">
                            <div className="flex gap-3 max-w-3xl mx-auto items-end">
                                <div className="flex-1 relative">
                                    <textarea
                                        placeholder="Type your reply..."
                                        className="w-full rounded-2xl bg-background border-border shadow-sm focus:ring-2 focus:ring-primary/20 transition-all p-4 outline-none resize-none min-h-[56px] max-h-32"
                                        rows={1}
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendReply();
                                            }
                                        }}
                                    />
                                    <div className="absolute right-4 bottom-4 flex gap-2">
                                        {/* Could add quick replies here */}
                                    </div>
                                </div>
                                <Button
                                    className="rounded-2xl h-14 w-14 shadow-lg gradient-primary text-white"
                                    size="icon"
                                    onClick={handleSendReply}
                                    disabled={!replyText.trim()}
                                >
                                    <Send className="w-6 h-6" />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground opacity-50">
                        <MessageSquare className="w-16 h-16 mb-4" />
                        <h3 className="text-xl font-bold">Select a ticket to join chat</h3>
                        <p>Live support tickets from your customers and riders will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
