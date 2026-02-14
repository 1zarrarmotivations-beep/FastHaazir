import React, { useState, useEffect, useRef, useMemo } from 'react';
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
    Package,
    MapPin,
    Phone,
    Filter,
    RefreshCw,
    Zap,
    Bell,
    Star,
    Navigation,
    ArrowRight,
    MessageCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    useAdminSupportTickets,
    useAdminJoinChat
} from '@/hooks/useAdminSupport';
import {
    useTicketMessages,
    useSendSupportMessage,
    useUpdateTicketStatus
} from '@/hooks/useSupport';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Quick reply templates
const QUICK_REPLIES = [
    { label: 'Greeting', message: "Hello! Thank you for contacting FastHaazir Support. I'm here to help you. How can I assist you today?" },
    { label: 'Checking Order', message: "I'm checking your order status now. Please hold on for a moment." },
    { label: 'Rider Contacted', message: "I've contacted the rider assigned to your order. They should reach out to you shortly." },
    { label: 'Refund Processing', message: "I've initiated the refund process for your order. It will be processed within 3-5 business days." },
    { label: 'Order Delayed', message: "I apologize for the delay. Your order is on its way and should arrive within 10-15 minutes." },
    { label: 'Issue Resolved', message: "I'm glad I could help resolve this issue. Is there anything else I can assist you with?" },
    { label: 'Closing', message: "Thank you for contacting FastHaazir Support. Have a great day! 🙏" },
];

export function EnhancedSupportTicketsManager() {
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
    const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const queryClient = useQueryClient();

    const { data: tickets, isLoading, refetch } = useAdminSupportTickets();
    const joinChat = useAdminJoinChat();
    const { data: messages } = useTicketMessages(selectedTicketId || undefined);
    const sendMessage = useSendSupportMessage();
    const updateStatus = useUpdateTicketStatus();

    const selectedTicket = tickets?.find(t => t.id === selectedTicketId);

    // Real-time subscription
    useEffect(() => {
        const channel = supabase
            .channel('admin-support-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'support_tickets'
                },
                (payload) => {
                    refetch();
                    queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });

                    if (payload.eventType === 'INSERT') {
                        const ticket = payload.new as any;
                        toast.info('🎫 New support ticket', {
                            description: `${(ticket.category || '').replace('_', ' ')} - Priority: ${ticket.priority || 'medium'}`,
                            action: {
                                label: 'View',
                                onClick: () => setSelectedTicketId(ticket.id)
                            }
                        });

                        // Play notification sound
                        try {
                            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2MkZaQkIuJiISCgH58e3l4d3Z1dXV2d3h5e3x+gIOGiY2RlZqdn6CgoJ+fnp2cm5qZmJeWlZSUk5OTk5OTlJSVlpeYmZqbnJ2en5+goKCfn56dnJuamZiXlpWUk5KSkZGQkJCQkJCRkZKSk5SVlpeYmZqbnJ2en5+goA==');
                            audio.volume = 0.7;
                            audio.play().catch(() => { });
                        } catch (e) { }
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'support_messages'
                },
                (payload) => {
                    const msg = payload.new as any;
                    if (msg.ticket_id === selectedTicketId) {
                        queryClient.invalidateQueries({ queryKey: ['support-messages', selectedTicketId] });
                    }
                    if (!msg.is_admin && !msg.is_system) {
                        toast.info('💬 New customer message', {
                            description: msg.message.slice(0, 50) + (msg.message.length > 50 ? '...' : ''),
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedTicketId, refetch, queryClient]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Filtered tickets
    const filteredTickets = useMemo(() => {
        return tickets?.filter(t => {
            const matchesSearch =
                (t as any).user_name?.toLowerCase().includes(search.toLowerCase()) ||
                (t.category || '').toLowerCase().includes(search.toLowerCase()) ||
                (t.id || '').includes(search);
            const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
            const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
            return matchesSearch && matchesStatus && matchesPriority;
        });
    }, [tickets, search, statusFilter, priorityFilter]);

    // Stats
    const stats = useMemo(() => ({
        total: tickets?.length || 0,
        open: tickets?.filter(t => t.status === 'open').length || 0,
        inProgress: tickets?.filter(t => t.status === 'in_progress').length || 0,
        resolved: tickets?.filter(t => t.status === 'resolved').length || 0,
        highPriority: tickets?.filter(t => t.priority === 'high' && t.status !== 'resolved').length || 0,
    }), [tickets]);

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedTicketId) return;

        await sendMessage.mutateAsync({
            ticketId: selectedTicketId,
            message: replyText.trim(),
            isAdmin: true
        });
        setReplyText('');

        if (selectedTicket?.status === 'open') {
            joinChat.mutate(selectedTicketId);
        }
    };

    const handleQuickReply = (message: string) => {
        setReplyText(message);
        inputRef.current?.focus();
    };

    const handleUpdatePriority = async (ticketId: string, priority: string) => {
        const { error } = await supabase
            .from('support_tickets' as any)
            .update({ priority })
            .eq('id', ticketId);

        if (!error) {
            refetch();
            toast.success(`Priority updated to ${priority}`);
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                            <p className="text-xs text-muted-foreground">Total Tickets</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.open}</p>
                            <p className="text-xs text-muted-foreground">Open</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <MessageCircle className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
                            <p className="text-xs text-muted-foreground">In Progress</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.resolved}</p>
                            <p className="text-xs text-muted-foreground">Resolved</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.highPriority}</p>
                            <p className="text-xs text-muted-foreground">High Priority</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-380px)] min-h-[500px]">
                {/* Left List */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    {/* Search & Filters */}
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search tickets, customers..."
                                className="pl-9 bg-background shadow-sm rounded-xl"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                                <SelectTrigger className="flex-1 rounded-xl h-9 text-xs">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={priorityFilter} onValueChange={(v: any) => setPriorityFilter(v)}>
                                <SelectTrigger className="flex-1 rounded-xl h-9 text-xs">
                                    <SelectValue placeholder="Priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Priority</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="icon"
                                className="rounded-xl h-9 w-9"
                                onClick={() => refetch()}
                            >
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Ticket List */}
                    <ScrollArea className="flex-1">
                        <div className="space-y-3 pr-4">
                            {filteredTickets?.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>No tickets found</p>
                                </div>
                            ) : (
                                filteredTickets?.map((ticket) => (
                                    <motion.button
                                        key={ticket.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={() => setSelectedTicketId(ticket.id)}
                                        className={`w-full text-left p-4 rounded-2xl transition-all border ${selectedTicketId === ticket.id
                                            ? 'bg-primary/5 border-primary shadow-md'
                                            : 'bg-background hover:bg-muted/50 border-border hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] uppercase font-bold tracking-wider rounded-md ${ticket.priority === 'high'
                                                        ? 'border-red-500/30 bg-red-500/10 text-red-500'
                                                        : ticket.priority === 'medium'
                                                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-500'
                                                            : 'border-gray-500/30 bg-gray-500/10 text-gray-500'
                                                        }`}
                                                >
                                                    {ticket.priority}
                                                </Badge>
                                                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider rounded-md border-primary/20 bg-primary/5 text-primary">
                                                    {(ticket.category || '').replace('_', ' ')}
                                                </Badge>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">
                                                {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-foreground truncate">
                                            {(ticket as any).user_name && (ticket as any).user_name !== 'Unknown'
                                                ? (ticket as any).user_name
                                                : `Customer ${(ticket as any).user_phone ? `(${(ticket as any).user_phone})` : ''}`}
                                        </h4>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                            {(ticket as any).user_phone && `📱 ${(ticket as any).user_phone}`}
                                            {ticket.order_id && ` • Order: #${ticket.order_id.slice(-6)}`}
                                        </p>
                                        <div className="flex items-center gap-2 mt-3">
                                            <div className={`w-2 h-2 rounded-full ${ticket.status === 'open' ? 'bg-amber-500 animate-pulse' :
                                                ticket.status === 'in_progress' ? 'bg-blue-500' : 'bg-emerald-500'
                                                }`} />
                                            <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                                {(ticket.status || '').replace('_', ' ')}
                                            </span>
                                        </div>
                                    </motion.button>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Right Chat Area */}
                <div className="lg:col-span-8 flex flex-col h-full bg-background rounded-3xl border shadow-sm overflow-hidden">
                    {selectedTicket ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 md:p-6 border-b flex items-center justify-between bg-muted/10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                        <User className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">
                                            {(selectedTicket as any).user_name && (selectedTicket as any).user_name !== 'Unknown'
                                                ? (selectedTicket as any).user_name
                                                : `Customer ${(selectedTicket as any).user_phone ? `(${(selectedTicket as any).user_phone})` : ''}`}
                                        </h3>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            {(selectedTicket as any).user_phone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    {(selectedTicket as any).user_phone}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                    {/* Priority Selector */}
                                    <Select
                                        value={selectedTicket.priority}
                                        onValueChange={(v) => handleUpdatePriority(selectedTicket.id, v)}
                                    >
                                        <SelectTrigger className="w-24 h-8 text-xs rounded-lg">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {selectedTicket.status !== 'resolved' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-xl"
                                            onClick={() => updateStatus.mutate({ ticketId: selectedTicket.id, status: 'resolved' })}
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2" /> Resolve
                                        </Button>
                                    )}
                                    {selectedTicket.order_id && (
                                        <Button variant="ghost" size="icon" className="rounded-xl">
                                            <ExternalLink className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Order Info Banner (if linked) */}
                            {selectedTicket.order_id && (
                                <div className="px-4 md:px-6 py-3 bg-blue-500/5 border-b border-blue-500/10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Package className="w-4 h-4 text-blue-500" />
                                            <span className="text-sm font-medium">
                                                Order #{selectedTicket.order_id.slice(-6)}
                                            </span>
                                            <Badge variant="outline" className="text-xs">
                                                {(selectedTicket as any).order_status}
                                            </Badge>
                                        </div>
                                        <span className="text-sm font-bold text-primary">
                                            Rs. {(selectedTicket as any).order_total?.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Messages */}
                            <ScrollArea className="flex-1 p-4 md:p-6">
                                <div className="space-y-4 max-w-3xl mx-auto">
                                    <AnimatePresence>
                                        {messages?.map((msg) => (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}
                                            >
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
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                                                    {!msg.is_system && (
                                                        <p className="text-[10px] mt-2 opacity-50 text-right">
                                                            {format(new Date(msg.created_at), 'HH:mm')}
                                                        </p>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                    <div ref={scrollRef} />
                                </div>
                            </ScrollArea>

                            {/* Quick Replies */}
                            <div className="px-4 md:px-6 py-2 border-t bg-muted/5 overflow-x-auto">
                                <div className="flex gap-2 flex-nowrap">
                                    <Zap className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                                    {QUICK_REPLIES.map((qr, idx) => (
                                        <Button
                                            key={idx}
                                            variant="outline"
                                            size="sm"
                                            className="text-xs rounded-full shrink-0 h-7"
                                            onClick={() => handleQuickReply(qr.message)}
                                        >
                                            {qr.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Input */}
                            <div className="p-4 md:p-6 border-t bg-muted/5">
                                <div className="flex gap-3 max-w-3xl mx-auto items-end">
                                    <div className="flex-1 relative">
                                        <textarea
                                            ref={inputRef}
                                            placeholder="Type your reply..."
                                            className="w-full rounded-2xl bg-background border border-border shadow-sm focus:ring-2 focus:ring-primary/20 transition-all p-4 outline-none resize-none min-h-[56px] max-h-32"
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
                                    </div>
                                    <Button
                                        className="rounded-2xl h-14 w-14 shadow-lg gradient-primary text-white"
                                        size="icon"
                                        onClick={handleSendReply}
                                        disabled={!replyText.trim() || sendMessage.isPending}
                                    >
                                        <Send className="w-6 h-6" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
                                <Headphones className="w-10 h-10 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-2">Select a Ticket</h3>
                            <p className="max-w-sm">
                                Choose a support ticket from the list to start chatting with the customer.
                            </p>
                            {stats.open > 0 && (
                                <p className="mt-4 text-sm">
                                    <span className="text-amber-500 font-bold">{stats.open}</span> tickets waiting for response
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default EnhancedSupportTicketsManager;
