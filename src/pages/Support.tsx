import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
    MessageSquare, Plus, ChevronRight, Loader2, Send,
    AlertCircle, CheckCircle, Clock, Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface SupportTicket {
    id: string;
    user_id: string;
    subject: string;
    category: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    created_at: string;
    updated_at: string;
}

interface SupportMessage {
    id: string;
    ticket_id: string;
    sender_id: string | null;
    message: string;
    is_admin: boolean;
    type?: 'text' | 'image' | 'system';
    created_at: string;
}

// Smart Auto-Replies (Client-Side Simulation)
const AUTO_REPLIES = {
    order: {
        ur: "آپ کا آرڈر جلد پہنچ جائے گا۔ رائڈر کی لوکیشن چیک کی جا رہی ہے۔",
        en: "Your order will arrive soon. Checking rider location."
    },
    payment: {
        ur: "براہ کرم اپنی ٹرانزیکشن آئی ڈی بھیجیں تاکہ ہم تصدیق کر سکیں۔",
        en: "Please send your transaction ID for verification."
    },
    technical: {
        ur: "ہماری ٹیکنیکل ٹیم کو اطلاع دے دی گئی ہے۔",
        en: "Our technical team has been notified."
    },
    default: {
        ur: "السلام علیکم! ہم آپ کی کیا مدد کر سکتے ہیں؟",
        en: "Assalam-o-Alaikum! How can we help you?"
    }
};

const Support = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch tickets
    const { data: tickets, isLoading: loadingTickets } = useQuery({
        queryKey: ['support-tickets'],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('support_tickets')
                .select('*')
                .order('updated_at', { ascending: false });
            if (error) throw error;
            return data as unknown as SupportTicket[];
        },
    });

    // Fetch messages
    const { data: messages, isLoading: loadingMessages } = useQuery({
        queryKey: ['support-messages', selectedTicketId],
        queryFn: async () => {
            if (!selectedTicketId) return [];
            const { data, error } = await (supabase as any)
                .from('support_messages')
                .select('*')
                .eq('ticket_id', selectedTicketId)
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data as unknown as SupportMessage[];
        },
        enabled: !!selectedTicketId,
        refetchInterval: 3000, // Poll for "Real-time" feel
    });

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, view]);

    // Create Ticket Mutation
    const createTicketMutation = useMutation({
        mutationFn: async (newTicket: { subject: string; category: string; message: string }) => {
            // 1. Create Ticket
            const { data: ticket, error: ticketError } = await (supabase as any)
                .from('support_tickets')
                .insert({
                    subject: newTicket.subject,
                    category: newTicket.category,
                    status: 'open',
                    user_type: 'customer' // Defaults to customer
                })
                .select()
                .single();

            if (ticketError) throw ticketError;
            const createdTicket = ticket as SupportTicket;

            // 2. Insert User Message
            const { error: messageError } = await (supabase as any)
                .from('support_messages')
                .insert({
                    ticket_id: createdTicket.id,
                    message: newTicket.message,
                    is_admin: false,
                    type: 'text'
                });

            if (messageError) throw messageError;

            return createdTicket;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
            setSelectedTicketId(data.id);
            setView('detail');
            toast.success('Chat started!');
        },
        onError: () => toast.error('Failed to start chat'),
    });

    // Send Message Mutation
    const sendMessageMutation = useMutation({
        mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
            const { error } = await (supabase as any)
                .from('support_messages')
                .insert({
                    ticket_id: ticketId,
                    message,
                    is_admin: false,
                });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['support-messages', selectedTicketId] });
            setNewMessage('');
        },
        onError: () => toast.error('Failed to send message'),
    });

    const handleCreateTicket = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        createTicketMutation.mutate({
            subject: formData.get('subject') as string,
            category: formData.get('category') as string,
            message: formData.get('message') as string,
        });
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedTicketId) return;
        sendMessageMutation.mutate({ ticketId: selectedTicketId, message: newMessage });
    };

    // Determine Auto-Reply based on category (Visual Only for now)
    const getAutoReply = (ticket: SupportTicket) => {
        const key = ticket.category === 'order_issue' ? 'order' :
            ticket.category === 'payment' ? 'payment' :
                ticket.category === 'technical' ? 'technical' : 'default';
        return AUTO_REPLIES[key as keyof typeof AUTO_REPLIES];
    };

    const statusColors: Record<string, string> = {
        open: 'bg-green-100 text-green-800 border-green-200',
        in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
        resolved: 'bg-gray-100 text-gray-800 border-gray-200',
        closed: 'bg-red-100 text-red-800 border-red-200',
    };

    // --- RENDER: LIST VIEW ---
    if (view === 'list') {
        return (
            <div className="container max-w-md mx-auto min-h-screen bg-background flex flex-col">
                {/* Premium Header */}
                <div className="bg-gradient-to-br from-primary via-primary/95 to-primary/80 p-6 text-primary-foreground shadow-2xl rounded-b-[2.5rem] relative z-10 overflow-hidden">
                    {/* Decorative Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full blur-2xl transform -translate-x-10"></div>
                    </div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                                    <MessageSquare className="w-6 h-6" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-extrabold font-english tracking-tight">Live Support</h1>
                                    <p className="text-xs opacity-90 font-english">24/7 Customer Care</p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="secondary"
                                className="rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 bg-white text-primary hover:bg-white/90 font-bold"
                                onClick={() => setView('create')}
                            >
                                <Plus className="w-4 h-4 mr-1" /> New
                            </Button>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl">
                            <Bot className="w-5 h-5" />
                            <p className="text-sm font-urdu" dir="rtl">
                                السلام علیکم! ہم آپ کی مدد کے لیے حاضر ہیں۔
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    {loadingTickets ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : tickets?.length === 0 ? (
                        <div className="text-center py-16 flex flex-col items-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
                                <MessageSquare className="w-12 h-12 text-primary" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-bold font-urdu mb-2" dir="rtl">کوئی چیٹ موجود نہیں</h3>
                            <p className="text-muted-foreground mb-8 font-urdu text-center max-w-xs" dir="rtl">نیا ٹکٹ بنا کر ہم سے رابطہ کریں۔ ہماری ٹیم فوری مدد کے لیے تیار ہے۔</p>
                            <Button onClick={() => setView('create')} size="lg" className="rounded-full shadow-xl hover:shadow-2xl transition-all px-8 font-bold">
                                <MessageSquare className="w-5 h-5 mr-2" />
                                Start Live Chat
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 px-2 mb-2">
                                <div className="h-1 w-1 rounded-full bg-primary"></div>
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Recent Conversations</h3>
                            </div>
                            {tickets?.map((ticket) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={ticket.id}
                                    onClick={() => { setSelectedTicketId(ticket.id); setView('detail'); }}
                                >
                                    <Card className="hover:shadow-xl hover:border-primary/70 transition-all duration-300 active:scale-[0.97] cursor-pointer border-l-4 border-l-primary/40 overflow-hidden bg-gradient-to-r from-white to-primary/5">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="flex-1 min-w-0 mr-4">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="font-semibold text-base truncate font-english">{ticket.subject}</h3>
                                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                                        {format(new Date(ticket.updated_at), 'MMM d')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground truncate mb-2">
                                                    <span className="font-urdu">{getAutoReply(ticket).ur}</span>
                                                </p>
                                                <Badge variant="outline" className={`text-[10px] px-2 py-0 h-5 ${statusColors[ticket.status]}`}>
                                                    {ticket.status.toUpperCase().replace('_', ' ')}
                                                </Badge>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        );
    }

    // --- RENDER: CREATE VIEW ---
    if (view === 'create') {
        return (
            <div className="container max-w-md mx-auto min-h-screen bg-background flex flex-col">
                <div className="p-4 flex items-center gap-3 border-b">
                    <Button variant="ghost" size="icon" onClick={() => setView('list')}>
                        <ChevronRight className="w-6 h-6 rotate-180" />
                    </Button>
                    <h2 className="text-lg font-bold">New Support Ticket</h2>
                </div>

                <div className="p-6 flex-1">
                    <form onSubmit={handleCreateTicket} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Topic (موضوع)</label>
                            <select
                                name="category"
                                className="w-full p-3 rounded-lg border bg-background"
                                required
                            >
                                <option value="order_issue">📦 Order Issue (آرڈر کا مسئلہ)</option>
                                <option value="payment">💰 Payment (ادائیگی)</option>
                                <option value="technical">🔧 App Issue (ایپ کی خرابی)</option>
                                <option value="other">🗣️ Other (دیگر)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Subject</label>
                            <Input name="subject" required placeholder="e.g. Late Delivery" className="h-12" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Message (تفصیل)</label>
                            <Textarea
                                name="message"
                                required
                                placeholder="Apna masla bayan karein..."
                                className="min-h-[150px] font-urdu text-right"
                            />
                        </div>

                        <Button size="lg" type="submit" className="w-full font-bold" disabled={createTicketMutation.isPending}>
                            {createTicketMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                            Start Chat
                        </Button>
                    </form>
                </div>
            </div>
        );
    }

    // --- RENDER: CHAT DETAIL VIEW ---
    const currentTicket = tickets?.find(t => t.id === selectedTicketId);
    const autoReply = currentTicket ? getAutoReply(currentTicket) : AUTO_REPLIES.default;

    return (
        <div className="container max-w-md mx-auto h-[100dvh] bg-[#EFE7DD] flex flex-col relative">
            {/* Background Pattern (WhatsApp style) */}
            <div className="absolute inset-0 opacity-5 pointer-events-none"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%23000000\' fill-opacity=\'1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' }}
            />

            {/* Header */}
            <div className="bg-primary px-4 py-3 flex items-center justify-between text-primary-foreground shadow-sm z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10 -ml-2" onClick={() => setView('list')}>
                        <ChevronRight className="w-6 h-6 rotate-180" />
                    </Button>
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                        <Bot className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold leading-none">Support Agent</h3>
                        <p className="text-xs opacity-80 mt-1 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Online
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 z-10">
                <div className="text-center text-xs text-muted-foreground my-4">
                    <span className="bg-[#E1F3FB] text-slate-600 px-3 py-1 rounded-full shadow-sm">
                        TICKET #{selectedTicketId?.slice(0, 6).toUpperCase()}
                    </span>
                </div>

                {/* Smart Auto-Reply Bubble (Optimistic) */}
                {messages && messages.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex justify-start"
                    >
                        <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm max-w-[85%] border border-white/50">
                            <p className="text-[15px] leading-relaxed text-gray-800 font-urdu mb-2" dir="rtl">
                                {autoReply.ur}
                            </p>
                            <p className="text-xs text-gray-500 border-t pt-1 mt-1 font-english">
                                {autoReply.en}
                            </p>
                            <span className="text-[10px] text-gray-400 block text-right mt-1">Bot • just now</span>
                        </div>
                    </motion.div>
                )}

                {/* Real Messages */}
                {loadingMessages ? (
                    <div className="flex justify-center mt-4">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    messages?.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${!msg.is_admin ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`
                relative px-3 py-2 shadow-sm max-w-[80%] rounded-xl
                ${!msg.is_admin
                                    ? 'bg-[#E7FFDB] text-gray-800 rounded-tr-none'
                                    : 'bg-white text-gray-800 rounded-tl-none'}
              `}>
                                <p className={`text-[15px] leading-relaxed ${!msg.is_admin ? 'font-urdu' : 'font-english'}`} dir={!msg.is_admin ? 'rtl' : 'ltr'}>
                                    {msg.message}
                                </p>
                                <div className="flex items-center justify-end gap-1 mt-1">
                                    <span className="text-[10px] text-gray-500">
                                        {format(new Date(msg.created_at), 'h:mm a')}
                                    </span>
                                    {!msg.is_admin && (
                                        <CheckCircle className="w-3 h-3 text-blue-500" />
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-[#F0F2F5] p-2 sm:p-3 flex items-end gap-2 z-20 shrink-0 safe-area-bottom">
                <Button variant="ghost" size="icon" className="mb-1 text-gray-500">
                    <Plus className="w-6 h-6" />
                </Button>
                <form onSubmit={handleSendMessage} className="flex-1 flex gap-2 items-end">
                    <div className="flex-1 bg-white rounded-[1.5rem] shadow-sm border border-gray-200 flex items-center overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        <Textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="min-h-[44px] max-h-[120px] py-3 px-4 border-0 resize-none focus-visible:ring-0 bg-transparent"
                            rows={1}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                        />
                    </div>
                    <Button
                        type="submit"
                        size="icon"
                        className={`w-11 h-11 rounded-full shadow-md shrink-0 transition-transform active:scale-95 ${!newMessage.trim() ? 'bg-gray-300 pointer-events-none' : 'bg-primary'}`}
                    >
                        {sendMessageMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default Support;
