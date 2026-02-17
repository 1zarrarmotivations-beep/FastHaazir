import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Headphones,
    MessageSquare,
    Clock,
    AlertTriangle,
    ChevronRight,
    Send,
    Phone,
    Bot,
    User,
    FileText,
    HelpCircle,
    CheckCircle,
    ArrowLeft,
    Loader2,
    Navigation,
    Star,
    Plus,
    X,
    SendHorizonal,
    Menu
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
import {
    useRiderSupportTickets,
    useRiderTicketMessages,
    useCreateRiderTicket,
    useSendRiderSupportMessage,
    useUpdateRiderTicketStatus,
    RiderSupportTicket,
    RiderSupportMessage
} from '@/hooks/useRiderSupport';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Rider-specific FAQ data
const RIDER_FAQ_ITEMS = [
    {
        category: 'Earnings & Payments',
        icon: FileText,
        questions: [
            { q: 'When do I get paid?', a: 'You receive weekly payouts every Sunday. Make sure your bank account details are updated in your profile.' },
            { q: 'How is my commission calculated?', a: 'You earn 80% of delivery fees plus tips. Check the Earnings section in your wallet for detailed breakdown.' },
            { q: 'Why was my payout delayed?', a: 'Payouts may be delayed due to bank processing times or account verification issues. Contact support if delayed beyond 3 days.' }
        ]
    },
    {
        category: 'Orders & Delivery',
        icon: Navigation,
        questions: [
            { q: 'How do I accept an order?', a: 'When you receive a delivery request, tap Accept on the order card. You have 30 seconds to accept before it expires.' },
            { q: 'Can I cancel an accepted order?', a: 'Only cancel if absolutely necessary. Frequent cancellations may affect your rider rating and account status.' },
            { q: 'What if the customer is unreachable?', a: 'Wait 5 minutes at the delivery location, then contact support for guidance. Document the attempt in the app.' }
        ]
    },
    {
        category: 'Account & Ratings',
        icon: Star,
        questions: [
            { q: 'How is my rating calculated?', a: 'Your rating is based on customer feedback from completed deliveries. Maintain above 4.0 to stay active.' },
            { q: 'How do I update my documents?', a: 'Go to Profile > Documents to update your CNIC or license. Expired documents will suspend your account.' },
            { q: 'What happens if I go offline?', a: 'Going offline stops new order requests. You can go online/offline anytime from the dashboard.' }
        ]
    },
    {
        category: 'Technical Issues',
        icon: HelpCircle,
        questions: [
            { q: 'GPS not working properly?', a: 'Enable high-accuracy mode in your phone settings. Close other apps using GPS for better accuracy.' },
            { q: 'App crashing or freezing?', a: 'Clear app cache, ensure you have the latest version. Restart your phone if issues persist.' },
            { q: 'Not receiving order notifications?', a: 'Check notification permissions in your phone settings. Ensure Do Not Disturb is off.' }
        ]
    }
];

// Support categories for riders
const RIDER_SUPPORT_CATEGORIES = [
    { id: 'earnings', label: 'Earnings Issue', icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'order_problem', label: 'Order Problem', icon: Navigation, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'account', label: 'Account Issue', icon: User, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'document', label: 'Document Issue', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 'technical', label: 'Technical Support', icon: HelpCircle, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { id: 'urgent', label: 'Urgent/ Emergency', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
];

type ViewState = 'categories' | 'tickets' | 'chat' | 'faq';

export default function RiderSupport() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { data: tickets, isLoading: ticketsLoading } = useRiderSupportTickets();
    const createTicket = useCreateRiderTicket();
    const sendMessage = useSendRiderSupportMessage();
    const updateStatus = useUpdateRiderTicketStatus();

    const [view, setView] = useState<ViewState>('categories');
    const [selectedTicket, setSelectedTicket] = useState<RiderSupportTicket | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [showNewTicket, setShowNewTicket] = useState(false);
    const [newTicketCategory, setNewTicketCategory] = useState('');
    const [newTicketSubject, setNewTicketSubject] = useState('');
    const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { data: messages, isLoading: messagesLoading } = useRiderTicketMessages(selectedTicket?.id);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle sending a message
    const handleSendMessage = async () => {
        if (!messageInput.trim() || !selectedTicket) return;

        try {
            await sendMessage.mutateAsync({
                ticketId: selectedTicket.id,
                message: messageInput.trim()
            });
            setMessageInput('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    // Handle creating a new ticket
    const handleCreateTicket = async () => {
        if (!newTicketSubject.trim() || !newTicketCategory) {
            toast.error('Please select a category and enter a subject');
            return;
        }

        try {
            const ticket = await createTicket.mutateAsync({
                subject: newTicketSubject,
                category: newTicketCategory,
                priority: newTicketCategory === 'urgent' ? 'urgent' : 'medium'
            });
            setShowNewTicket(false);
            setNewTicketSubject('');
            setNewTicketCategory('');
            setSelectedTicket(ticket);
            setView('chat');
        } catch (error) {
            console.error('Error creating ticket:', error);
        }
    };

    // Select a category and show new ticket form
    const handleCategorySelect = (categoryId: string) => {
        setNewTicketCategory(categoryId);
        setShowNewTicket(true);
    };

    // Open existing ticket for chat
    const handleTicketSelect = (ticket: RiderSupportTicket) => {
        setSelectedTicket(ticket);
        setView('chat');
    };

    // Get status badge color
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open':
                return <Badge className="bg-blue-500/20 text-blue-400">Open</Badge>;
            case 'in_progress':
                return <Badge className="bg-amber-500/20 text-amber-400">In Progress</Badge>;
            case 'resolved':
                return <Badge className="bg-emerald-500/20 text-emerald-400">Resolved</Badge>;
            case 'closed':
                return <Badge className="bg-gray-500/20 text-gray-400">Closed</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    // Format time ago
    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-white/10">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        {view !== 'categories' && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    if (view === 'chat') {
                                        setSelectedTicket(null);
                                        setView('tickets');
                                    } else if (view === 'tickets') {
                                        setView('categories');
                                    } else if (view === 'faq') {
                                        setView('categories');
                                    }
                                }}
                                className="text-white hover:bg-white/10"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                <Headphones className="w-5 h-5 text-purple-400" />
                                Rider Support
                            </h1>
                            <p className="text-xs text-gray-400">
                                {view === 'categories' && 'How can we help you today?'}
                                {view === 'tickets' && `${tickets?.length || 0} support tickets`}
                                {view === 'chat' && selectedTicket?.subject}
                                {view === 'faq' && 'Frequently Asked Questions'}
                            </p>
                        </div>
                    </div>

                    {view === 'categories' && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setView('tickets')}
                            className="border-white/20 text-white hover:bg-white/10"
                        >
                            My Tickets
                        </Button>
                    )}
                </div>

                {/* Quick Tabs */}
                {view === 'categories' && (
                    <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => setView('categories')}
                            className="bg-purple-600 hover:bg-purple-700 whitespace-nowrap"
                        >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Get Help
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setView('faq')}
                            className="border-white/20 text-white hover:bg-white/10 whitespace-nowrap"
                        >
                            <HelpCircle className="w-4 h-4 mr-2" />
                            FAQ
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setView('tickets')}
                            className="border-white/20 text-white hover:bg-white/10 whitespace-nowrap"
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            My Tickets
                        </Button>
                    </div>
                )}
            </div>

            <div className="p-4">
                {/* Categories View */}
                {view === 'categories' && !showNewTicket && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        {/* Emergency Banner */}
                        <Card className="bg-gradient-to-r from-red-600/20 to-red-500/10 border-red-500/30">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                                        <AlertTriangle className="w-5 h-5 text-red-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-red-400">Emergency Support</h3>
                                        <p className="text-sm text-gray-300 mt-1">
                                            Facing an urgent issue? Our team is available 24/7 for emergencies.
                                        </p>
                                        <Button
                                            size="sm"
                                            className="mt-3 bg-red-600 hover:bg-red-700"
                                            onClick={() => handleCategorySelect('urgent')}
                                        >
                                            Contact Now
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Support Categories */}
                        <div className="grid grid-cols-2 gap-3">
                            {RIDER_SUPPORT_CATEGORIES.map((category) => (
                                <motion.button
                                    key={category.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleCategorySelect(category.id)}
                                    className={`p-4 rounded-xl ${category.bg} border border-white/10 text-left`}
                                >
                                    <category.icon className={`w-6 h-6 ${category.color} mb-2`} />
                                    <p className="font-medium text-white text-sm">{category.label}</p>
                                </motion.button>
                            ))}
                        </div>

                        {/* Live Chat Option */}
                        <Card className="bg-gradient-to-r from-purple-600/20 to-blue-600/10 border-purple-500/30">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                            <MessageSquare className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white">Live Chat</h3>
                                            <p className="text-xs text-gray-400">Chat with our support team</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-xs text-green-400">Online</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* New Ticket Form */}
                {view === 'categories' && showNewTicket && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <Card className="bg-slate-800/50 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-purple-400" />
                                    Create New Ticket
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label className="text-gray-300">Category</Label>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {RIDER_SUPPORT_CATEGORIES.map((cat) => (
                                            <Button
                                                key={cat.id}
                                                variant={newTicketCategory === cat.id ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setNewTicketCategory(cat.id)}
                                                className={newTicketCategory === cat.id
                                                    ? 'bg-purple-600 hover:bg-purple-700'
                                                    : 'border-white/20 text-white hover:bg-white/10'}
                                            >
                                                <cat.icon className="w-4 h-4 mr-1" />
                                                {cat.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-gray-300">Subject</Label>
                                    <Input
                                        value={newTicketSubject}
                                        onChange={(e) => setNewTicketSubject(e.target.value)}
                                        placeholder="Describe your issue..."
                                        className="mt-2 bg-slate-700/50 border-white/10 text-white"
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowNewTicket(false)}
                                        className="flex-1 border-white/20 text-white hover:bg-white/10"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleCreateTicket}
                                        disabled={createTicket.isPending}
                                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                                    >
                                        {createTicket.isPending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                Create Ticket
                                                <ChevronRight className="w-4 h-4 ml-1" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Tickets List View */}
                {view === 'tickets' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                    >
                        <Button
                            onClick={() => {
                                setShowNewTicket(true);
                                setView('categories');
                            }}
                            className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Ticket
                        </Button>

                        {ticketsLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                            </div>
                        ) : tickets && tickets.length > 0 ? (
                            <div className="space-y-2">
                                {tickets.map((ticket) => (
                                    <Card
                                        key={ticket.id}
                                        className="bg-slate-800/50 border-white/10 cursor-pointer hover:bg-slate-700/50"
                                        onClick={() => handleTicketSelect(ticket)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-medium text-white">{ticket.subject}</h3>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {ticket.category.replace(/_/g, ' ')} • {formatTimeAgo(ticket.created_at)}
                                                    </p>
                                                </div>
                                                {getStatusBadge(ticket.status)}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card className="bg-slate-800/50 border-white/10">
                                <CardContent className="p-8 text-center">
                                    <MessageSquare className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                                    <p className="text-gray-400">No support tickets yet</p>
                                    <Button
                                        onClick={() => {
                                            setShowNewTicket(true);
                                            setView('categories');
                                        }}
                                        className="mt-4 bg-purple-600 hover:bg-purple-700"
                                    >
                                        Create First Ticket
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </motion.div>
                )}

                {/* Chat View */}
                {view === 'chat' && selectedTicket && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-[calc(100vh-200px)] flex flex-col"
                    >
                        {/* Ticket Info */}
                        <Card className="bg-slate-800/50 border-white/10 mb-2">
                            <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-white text-sm">{selectedTicket.subject}</h3>
                                        <p className="text-xs text-gray-400">
                                            {selectedTicket.category.replace(/_/g, ' ')} • {format(new Date(selectedTicket.created_at), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                    {getStatusBadge(selectedTicket.status)}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Messages */}
                        <ScrollArea className="flex-1 p-2">
                            <div className="space-y-3">
                                {messagesLoading ? (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                                    </div>
                                ) : messages && messages.length > 0 ? (
                                    messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex ${msg.sender_type === 'rider' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[80%] p-3 rounded-xl ${msg.sender_type === 'rider'
                                                        ? 'bg-purple-600 text-white'
                                                        : msg.sender_type === 'system'
                                                            ? 'bg-gray-700/50 text-gray-300 text-center w-full'
                                                            : 'bg-slate-700 text-white'
                                                    }`}
                                            >
                                                {msg.sender_type === 'system' ? (
                                                    <p className="text-xs">{msg.message}</p>
                                                ) : (
                                                    <>
                                                        <p className="text-xs font-medium mb-1 opacity-70">
                                                            {msg.sender_type === 'rider' ? 'You' : msg.sender_type === 'admin' ? 'Support Team' : 'System'}
                                                        </p>
                                                        <p className="text-sm">{msg.message}</p>
                                                        <p className="text-xs opacity-50 mt-1">
                                                            {format(new Date(msg.created_at), 'h:mm a')}
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <MessageSquare className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                                        <p className="text-gray-400 text-sm">No messages yet. Start the conversation!</p>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        {/* Message Input */}
                        {selectedTicket.status !== 'closed' && (
                            <div className="p-2 border-t border-white/10">
                                <div className="flex gap-2">
                                    <Input
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Type your message..."
                                        className="bg-slate-700/50 border-white/10 text-white"
                                    />
                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={!messageInput.trim() || sendMessage.isPending}
                                        className="bg-purple-600 hover:bg-purple-700"
                                    >
                                        {sendMessage.isPending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <SendHorizonal className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* FAQ View */}
                {view === 'faq' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                    >
                        {RIDER_FAQ_ITEMS.map((category, idx) => (
                            <Card key={idx} className="bg-slate-800/50 border-white/10">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-white text-sm flex items-center gap-2">
                                        <category.icon className="w-4 h-4 text-purple-400" />
                                        {category.category}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {category.questions.map((item, qIdx) => (
                                        <div
                                            key={qIdx}
                                            className="border border-white/10 rounded-lg overflow-hidden"
                                        >
                                            <button
                                                onClick={() => setExpandedFaq(expandedFaq === `${idx}-${qIdx}` ? null : `${idx}-${qIdx}`)}
                                                className="w-full p-3 text-left flex items-center justify-between hover:bg-white/5"
                                            >
                                                <span className="text-sm text-white font-medium">{item.q}</span>
                                                <ChevronRight
                                                    className={`w-4 h-4 text-gray-400 transition-transform ${expandedFaq === `${idx}-${qIdx}` ? 'rotate-90' : ''
                                                        }`}
                                                />
                                            </button>
                                            <AnimatePresence>
                                                {expandedFaq === `${idx}-${qIdx}` && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                    >
                                                        <div className="px-3 pb-3">
                                                            <p className="text-sm text-gray-300">{item.a}</p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
