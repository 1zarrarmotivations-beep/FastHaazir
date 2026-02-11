import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Headphones,
    MessageSquare,
    Package,
    Clock,
    AlertTriangle,
    ChevronRight,
    Send,
    MapPin,
    Phone,
    Bot,
    User,
    FileText,
    HelpCircle,
    CheckCircle,
    ArrowLeft,
    Loader2,
    Navigation,
    Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrders } from '@/hooks/useOrders';
import {
    useSupportTickets,
    useTicketMessages,
    useCreateTicket,
    useSendSupportMessage,
    useUpdateTicketStatus,
    SupportTicket,
    SupportMessage
} from '@/hooks/useSupport';
import { useRiderCurrentLocation } from '@/hooks/useRiderLocation';
import { SUPPORT_FLOW, SupportCategory } from '@/lib/supportFlow';
import { format } from 'date-fns';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';
import LiveRiderTrackingMap from '@/components/tracking/LiveRiderTrackingMap';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

// FAQ data
const FAQ_ITEMS = [
    {
        category: 'Orders',
        icon: Package,
        questions: [
            { q: 'How do I track my order?', a: 'Go to the Orders page and tap on your active order to see live tracking with rider location.' },
            { q: 'Can I cancel my order?', a: 'Orders can be cancelled before the restaurant starts preparing. Contact support for assistance.' },
            { q: 'What if my order is late?', a: 'If your order is delayed beyond 45 minutes, contact support for a status update or compensation.' },
        ]
    },
    {
        category: 'Payments',
        icon: FileText,
        questions: [
            { q: 'What payment methods are accepted?', a: 'We accept Cash on Delivery (COD), JazzCash, Easypaisa, and bank transfers.' },
            { q: 'How do I get a refund?', a: 'Refunds are processed within 3-5 business days after approval. Contact support with your order details.' },
            { q: 'Why was I charged twice?', a: 'Double charges are rare but can happen. Contact support with screenshot proof for immediate resolution.' },
        ]
    },
    {
        category: 'Riders',
        icon: Navigation,
        questions: [
            { q: 'How do I contact my rider?', a: 'You can chat with your rider directly from the active order screen.' },
            { q: 'Rider is not responding?', a: 'If the rider is unresponsive, contact support and we will assist immediately.' },
            { q: 'Can I rate my delivery experience?', a: 'Yes! After delivery, you can rate both the order and the rider.' },
        ]
    },
];

// Support categories with icons
const SUPPORT_CATEGORIES = [
    { id: 'order_late', label: 'Order is Late', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 'rider_issue', label: 'Rider Problem', icon: Navigation, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'payment_issue', label: 'Payment Issue', icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'cancel_request', label: 'Cancel Order', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { id: 'app_problem', label: 'App Problem', icon: HelpCircle, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'other', label: 'Something Else', icon: MessageSquare, color: 'text-gray-500', bg: 'bg-gray-500/10' },
];

export default function Support() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { data: orders } = useOrders();
    const { data: tickets, refetch: refetchTickets } = useSupportTickets();
    const createTicket = useCreateTicket();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState('chat');
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

    // Active orders for tracking
    const activeOrders = orders?.filter(o =>
        ['placed', 'preparing', 'on_way'].includes(o.status)
    ) || [];

    // Real-time subscription for ticket updates
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`support-tickets-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'support_tickets',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    refetchTickets();
                    queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, refetchTickets, queryClient]);

    // Handle starting a new support ticket
    const handleStartSupport = async (category: SupportCategory, orderId?: string) => {
        if (!user) {
            toast.error('Please login to contact support');
            navigate('/auth');
            return;
        }

        try {
            const ticket = await createTicket.mutateAsync({ category, orderId });
            setSelectedTicket(ticket);
            setActiveTab('chat');
            toast.success('Support ticket created! An agent will assist you shortly.');
        } catch (error) {
            toast.error('Failed to create support ticket');
        }
    };

    // Loading state
    if (authLoading) {
        return (
            <div className="mobile-container bg-background min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="mobile-container bg-background min-h-screen pb-24">
            {/* Premium Header */}
            <header className="sticky top-0 z-50 glass border-b border-border/50">
                <div className="relative overflow-hidden">
                    <div className="absolute inset-0 gradient-primary opacity-90" />
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1Ii8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
                    <div className="relative px-4 py-6 text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                                <Headphones className="w-7 h-7" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Support Center</h1>
                                <p className="text-sm opacity-90">We're here to help 24/7</p>
                            </div>
                        </div>

                        {/* Live status indicator */}
                        <div className="mt-4 flex items-center gap-2">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-xs font-medium">Live Support Online</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm">
                                <Clock className="w-3 h-3" />
                                <span className="text-xs font-medium">Avg. Response: 2 min</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="px-4 py-2 bg-background/80 backdrop-blur-md">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid grid-cols-4 bg-muted/50 p-1 rounded-xl h-auto">
                            <TabsTrigger value="chat" className="text-xs py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                <MessageSquare className="w-4 h-4 mr-1.5" />
                                Chat
                            </TabsTrigger>
                            <TabsTrigger value="track" className="text-xs py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                <MapPin className="w-4 h-4 mr-1.5" />
                                Track
                            </TabsTrigger>
                            <TabsTrigger value="tickets" className="text-xs py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative">
                                <FileText className="w-4 h-4 mr-1.5" />
                                History
                                {tickets && tickets.filter(t => t.status !== 'resolved').length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                                        {tickets.filter(t => t.status !== 'resolved').length}
                                    </span>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="faq" className="text-xs py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                <HelpCircle className="w-4 h-4 mr-1.5" />
                                FAQ
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </header>

            {/* Tab Content */}
            <div className="p-4">
                <AnimatePresence mode="wait">
                    {/* Chat Tab */}
                    {activeTab === 'chat' && (
                        <motion.div
                            key="chat"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-4"
                        >
                            {selectedTicket ? (
                                <LiveChatView
                                    ticket={selectedTicket}
                                    onBack={() => setSelectedTicket(null)}
                                />
                            ) : (
                                <>
                                    {/* Quick Actions */}
                                    <div className="space-y-3">
                                        <h2 className="text-lg font-bold text-foreground">How can we help?</h2>
                                        <div className="grid grid-cols-2 gap-3">
                                            {SUPPORT_CATEGORIES.map((cat) => (
                                                <motion.button
                                                    key={cat.id}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => handleStartSupport(cat.id as SupportCategory)}
                                                    className={`p-4 rounded-2xl border border-border bg-card hover:shadow-lg transition-all text-left ${cat.bg}`}
                                                >
                                                    <cat.icon className={`w-6 h-6 ${cat.color} mb-2`} />
                                                    <p className="font-medium text-sm text-foreground">{cat.label}</p>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Active Orders for Quick Support */}
                                    {activeOrders.length > 0 && (
                                        <div className="space-y-3">
                                            <h2 className="text-lg font-bold text-foreground">Need help with an order?</h2>
                                            {activeOrders.slice(0, 3).map((order) => (
                                                <Card key={order.id} variant="elevated" className="p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div>
                                                            <p className="font-semibold">{order.businesses?.name || 'Delivery Order'}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Order #{order.id.slice(-6)} • {format(new Date(order.created_at), 'h:mm a')}
                                                            </p>
                                                        </div>
                                                        <Badge variant={order.status === 'on_way' ? 'default' : 'secondary'}>
                                                            {order.status.replace('_', ' ')}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex gap-2 mt-3">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="flex-1"
                                                            onClick={() => {
                                                                setSelectedOrderId(order.id);
                                                                setActiveTab('track');
                                                            }}
                                                        >
                                                            <MapPin className="w-4 h-4 mr-1.5" />
                                                            Track
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="flex-1 gradient-primary text-white"
                                                            onClick={() => handleStartSupport('order_late', order.id)}
                                                        >
                                                            <Headphones className="w-4 h-4 mr-1.5" />
                                                            Get Help
                                                        </Button>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    )}

                                    {/* Open Tickets */}
                                    {tickets && tickets.filter(t => t.status !== 'resolved').length > 0 && (
                                        <div className="space-y-3">
                                            <h2 className="text-lg font-bold text-foreground">Open Conversations</h2>
                                            {tickets.filter(t => t.status !== 'resolved').map((ticket) => (
                                                <button
                                                    key={ticket.id}
                                                    onClick={() => setSelectedTicket(ticket)}
                                                    className="w-full text-left p-4 rounded-2xl border border-border bg-card hover:shadow-md transition-all"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                                <MessageSquare className="w-5 h-5 text-primary" />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-foreground capitalize">
                                                                    {ticket.category.replace('_', ' ')}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {format(new Date(ticket.created_at), 'MMM d, h:mm a')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant={ticket.status === 'in_progress' ? 'default' : 'secondary'}>
                                                                {ticket.status === 'in_progress' ? 'Active' : 'Open'}
                                                            </Badge>
                                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    )}

                    {/* Track Tab */}
                    {activeTab === 'track' && (
                        <motion.div
                            key="track"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-4"
                        >
                            <h2 className="text-lg font-bold text-foreground">Live Order Tracking</h2>

                            {activeOrders.length === 0 ? (
                                <Card className="p-8 text-center">
                                    <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                                    <h3 className="font-semibold text-lg mb-2">No Active Orders</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        When you place an order, you can track it here in real-time.
                                    </p>
                                    <Button onClick={() => navigate('/')}>
                                        Browse Restaurants
                                    </Button>
                                </Card>
                            ) : (
                                activeOrders.map((order) => (
                                    <OrderTrackingCard
                                        key={order.id}
                                        order={order}
                                        isExpanded={selectedOrderId === order.id}
                                        onToggle={() => setSelectedOrderId(
                                            selectedOrderId === order.id ? null : order.id
                                        )}
                                    />
                                ))
                            )}
                        </motion.div>
                    )}

                    {/* Tickets History Tab */}
                    {activeTab === 'tickets' && (
                        <motion.div
                            key="tickets"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-4"
                        >
                            <h2 className="text-lg font-bold text-foreground">Support History</h2>

                            {!tickets || tickets.length === 0 ? (
                                <Card className="p-8 text-center">
                                    <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                                    <h3 className="font-semibold text-lg mb-2">No Support Tickets</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Your support conversations will appear here.
                                    </p>
                                    <Button onClick={() => setActiveTab('chat')}>
                                        Start a Conversation
                                    </Button>
                                </Card>
                            ) : (
                                <div className="space-y-3">
                                    {tickets.map((ticket) => (
                                        <button
                                            key={ticket.id}
                                            onClick={() => {
                                                setSelectedTicket(ticket);
                                                setActiveTab('chat');
                                            }}
                                            className="w-full text-left p-4 rounded-2xl border border-border bg-card hover:shadow-md transition-all"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <Badge
                                                    variant={
                                                        ticket.status === 'resolved' ? 'success' :
                                                            ticket.status === 'in_progress' ? 'default' : 'secondary'
                                                    }
                                                >
                                                    {ticket.status === 'in_progress' ? 'In Progress' :
                                                        ticket.status === 'resolved' ? 'Resolved' : 'Open'}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                                                </span>
                                            </div>
                                            <p className="font-medium capitalize text-foreground">
                                                {ticket.category.replace('_', ' ')}
                                            </p>
                                            {ticket.order_id && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Order #{ticket.order_id.slice(-6)}
                                                </p>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* FAQ Tab */}
                    {activeTab === 'faq' && (
                        <motion.div
                            key="faq"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            {FAQ_ITEMS.map((section) => (
                                <div key={section.category} className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <section.icon className="w-5 h-5 text-primary" />
                                        <h2 className="text-lg font-bold text-foreground">{section.category}</h2>
                                    </div>
                                    <div className="space-y-2">
                                        {section.questions.map((item, idx) => (
                                            <Card
                                                key={idx}
                                                className="overflow-hidden cursor-pointer hover:shadow-md transition-all"
                                                onClick={() => setExpandedFaq(
                                                    expandedFaq === `${section.category}-${idx}` ? null : `${section.category}-${idx}`
                                                )}
                                            >
                                                <div className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-medium text-sm text-foreground pr-4">{item.q}</p>
                                                        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedFaq === `${section.category}-${idx}` ? 'rotate-90' : ''
                                                            }`} />
                                                    </div>
                                                    <AnimatePresence>
                                                        {expandedFaq === `${section.category}-${idx}` && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border">
                                                                    {item.a}
                                                                </p>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Still need help? */}
                            <Card className="p-6 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                                <Headphones className="w-12 h-12 text-primary mx-auto mb-3" />
                                <h3 className="font-bold text-lg mb-2">Still need help?</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Our support team is available 24/7 to assist you.
                                </p>
                                <Button
                                    className="gradient-primary text-white"
                                    onClick={() => setActiveTab('chat')}
                                >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Start Live Chat
                                </Button>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <BottomNav />
        </div>
    );
}

// Live Chat Component
function LiveChatView({ ticket, onBack }: { ticket: SupportTicket; onBack: () => void }) {
    const [input, setInput] = useState('');
    const [currentStepId, setCurrentStepId] = useState('start');
    const scrollRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    const { data: messages, isLoading } = useTicketMessages(ticket.id);
    const sendMessage = useSendSupportMessage();
    const updateStatus = useUpdateTicketStatus();

    // Real-time subscription for messages
    useEffect(() => {
        const channel = supabase
            .channel(`support-messages-${ticket.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'support_messages',
                    filter: `ticket_id=eq.${ticket.id}`
                },
                (payload) => {
                    queryClient.invalidateQueries({ queryKey: ['support-messages', ticket.id] });

                    // Play notification sound for admin messages
                    const newMsg = payload.new as SupportMessage;
                    if (newMsg.is_admin) {
                        try {
                            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2MkZaQkIuJiISCgH58e3l4d3Z1dXV2d3h5e3x+gIOGiY2RlZqdn6CgoJ+fnp2cm5qZmJeWlZSUk5OTk5OTlJSVlpeYmZqbnJ2en5+goKCfn56dnJuamZiXlpWUk5KSkZGQkJCQkJCRkZKSk5SVlpeYmZqbnJ2en5+goA==');
                            audio.volume = 0.5;
                            audio.play().catch(() => { });
                        } catch (e) { }
                        toast.info('💬 New message from Support Agent');
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [ticket.id, queryClient]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleOptionClick = async (option: any) => {
        await sendMessage.mutateAsync({
            ticketId: ticket.id,
            message: option.label
        });

        if (option.action === 'resolve') {
            await updateStatus.mutateAsync({ ticketId: ticket.id, status: 'resolved' });
            await sendMessage.mutateAsync({
                ticketId: ticket.id,
                message: "Ticket marked as resolved. Have a great day!",
                isSystem: true
            });
            return;
        }

        if (option.action === 'escalate') {
            await sendMessage.mutateAsync({
                ticketId: ticket.id,
                message: "Connecting you to a support agent...",
                isSystem: true
            });
        }

        if (option.nextStepId) {
            const nextStep = SUPPORT_FLOW[option.nextStepId];
            if (nextStep) {
                setCurrentStepId(option.nextStepId);
                await sendMessage.mutateAsync({
                    ticketId: ticket.id,
                    message: nextStep.message,
                    isSystem: true
                });
            }
        }
    };

    const handleSendText = async () => {
        if (!input.trim()) return;
        await sendMessage.mutateAsync({
            ticketId: ticket.id,
            message: input.trim()
        });
        setInput('');
    };

    const currentStep = SUPPORT_FLOW[currentStepId];

    return (
        <div className="flex flex-col h-[calc(100vh-280px)] -mx-4 -mt-4">
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center gap-3 bg-background/95 backdrop-blur-sm">
                <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <h3 className="font-semibold capitalize">{ticket.category.replace('_', ' ')}</h3>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${ticket.status === 'resolved' ? 'bg-emerald-500' :
                            ticket.status === 'in_progress' ? 'bg-blue-500 animate-pulse' : 'bg-amber-500 animate-pulse'
                            }`} />
                        <span className="text-xs text-muted-foreground capitalize">
                            {ticket.status.replace('_', ' ')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    <AnimatePresence>
                        {messages?.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`flex ${msg.sender_id === null || msg.is_system ? 'justify-start' :
                                    msg.is_admin ? 'justify-start' : 'justify-end'}`}
                            >
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.is_system
                                    ? 'bg-muted text-foreground border border-border'
                                    : msg.is_admin
                                        ? 'bg-accent text-accent-foreground rounded-tl-none shadow-md'
                                        : 'gradient-primary text-white rounded-tr-none shadow-md'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-1 opacity-70">
                                        {msg.is_system ? <Bot className="w-3 h-3" /> :
                                            msg.is_admin ? <Headphones className="w-3 h-3" /> :
                                                <User className="w-3 h-3" />}
                                        <span className="text-[10px] font-bold uppercase tracking-wider">
                                            {msg.is_system ? 'Assistant' : msg.is_admin ? 'Agent' : 'You'}
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
                    {ticket.status === 'open' && currentStep?.options && currentStep.options.length > 0 && (
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
                                    className="rounded-full bg-white shadow-sm border border-border hover:bg-primary hover:text-white transition-colors justify-start h-auto py-2 px-4"
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

            {/* Input */}
            <div className="p-4 border-t border-border bg-background">
                <div className="flex gap-2">
                    <Input
                        placeholder="Type your message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendText()}
                        className="rounded-full bg-muted border-none"
                    />
                    <Button
                        size="icon"
                        className="rounded-full shadow-lg gradient-primary text-white shrink-0"
                        onClick={handleSendText}
                        disabled={!input.trim() || sendMessage.isPending}
                    >
                        {sendMessage.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// Order Tracking Card Component
function OrderTrackingCard({ order, isExpanded, onToggle }: { order: any; isExpanded: boolean; onToggle: () => void }) {
    const { data: riderLocation } = useRiderCurrentLocation(order.rider_id);

    const statusSteps = [
        { status: 'placed', label: 'Order Placed', icon: CheckCircle },
        { status: 'preparing', label: 'Preparing', icon: Clock },
        { status: 'on_way', label: 'On the Way', icon: Navigation },
        { status: 'delivered', label: 'Delivered', icon: CheckCircle },
    ];

    const currentStepIndex = statusSteps.findIndex(s => s.status === order.status);

    return (
        <Card className="overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full p-4 text-left"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-semibold">{order.businesses?.name || 'Delivery Order'}</p>
                        <p className="text-xs text-muted-foreground">
                            Order #{order.id.slice(-6)} • Rs. {order.total.toLocaleString()}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={order.status === 'on_way' ? 'default' : 'secondary'}>
                            {order.status.replace('_', ' ')}
                        </Badge>
                        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full gradient-primary transition-all duration-500"
                            style={{ width: `${((currentStepIndex + 1) / statusSteps.length) * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-2">
                        {statusSteps.slice(0, 4).map((step, idx) => (
                            <div key={step.status} className="flex flex-col items-center">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${idx <= currentStepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                    }`}>
                                    <step.icon className="w-3 h-3" />
                                </div>
                                <span className="text-[10px] text-muted-foreground mt-1">{step.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 pt-0 space-y-4">
                            {/* Live Map */}
                            {order.rider_id && ['preparing', 'on_way'].includes(order.status) && (
                                <LiveRiderTrackingMap
                                    riderId={order.rider_id}
                                    deliveryLat={order.delivery_lat}
                                    deliveryLng={order.delivery_lng}
                                    deliveryAddress={order.delivery_address}
                                    pickupLat={order.pickup_lat}
                                    pickupLng={order.pickup_lng}
                                    pickupAddress={order.pickup_address || order.businesses?.address}
                                    status={order.status}
                                />
                            )}

                            {/* Rider Info */}
                            {order.riders && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Navigation className="w-6 h-6 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold">{order.riders.name}</p>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                            <span>{order.riders.rating?.toFixed(1) || '5.0'}</span>
                                            <span>•</span>
                                            <span className="capitalize">{order.riders.vehicle_type}</span>
                                        </div>
                                    </div>
                                    {riderLocation?.is_online && (
                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                            Online
                                        </Badge>
                                    )}
                                </div>
                            )}

                            {/* Delivery Address */}
                            <div className="p-3 rounded-xl bg-muted/50">
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-primary mt-0.5" />
                                    <div>
                                        <p className="font-medium text-sm">Delivery Address</p>
                                        <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
}
