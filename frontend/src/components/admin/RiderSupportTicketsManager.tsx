import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare,
    Clock,
    CheckCircle,
    AlertTriangle,
    Send,
    User,
    ChevronRight,
    ArrowLeft,
    Loader2,
    Search,
    Filter,
    MoreVertical,
    Phone,
    Star,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
    useAdminRiderSupportTickets,
    useAdminRiderTicketMessages,
    useAdminSendRiderSupportMessage,
    useAdminUpdateRiderTicketStatus,
    useAdminAssignRiderTicket,
    useRiderInfo,
    RiderSupportTicket,
    RiderSupportMessage
} from '@/hooks/useAdminRiderSupport';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { safeLower } from '@/lib/utils';

type ViewState = 'list' | 'chat';

export default function RiderSupportTicketsManager() {
    const { user } = useAuth();
    const { data: tickets, isLoading, refetch } = useAdminRiderSupportTickets();
    const sendMessage = useAdminSendRiderSupportMessage();
    const updateStatus = useAdminUpdateRiderTicketStatus();
    const assignTicket = useAdminAssignRiderTicket();

    const [view, setView] = useState<ViewState>('list');
    const [selectedTicket, setSelectedTicket] = useState<RiderSupportTicket | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useAdminRiderTicketMessages(selectedTicket?.id);
    const { data: riderInfo } = useRiderInfo(selectedTicket?.rider_id || '');

    // Auto-refresh messages
    useEffect(() => {
        if (selectedTicket?.id) {
            const interval = setInterval(() => {
                refetchMessages();
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [selectedTicket?.id, refetchMessages]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Filter tickets
    const filteredTickets = tickets?.filter(ticket => {
        const matchesSearch = safeLower(ticket.subject).includes(safeLower(searchQuery)) ||
            safeLower(ticket.category).includes(safeLower(searchQuery));
        const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
        return matchesSearch && matchesStatus;
    }) || [];

    // Handle sending message
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

    // Handle status update
    const handleStatusUpdate = async (status: string) => {
        if (!selectedTicket) return;

        try {
            await updateStatus.mutateAsync({
                ticketId: selectedTicket.id,
                status
            });
            setSelectedTicket({ ...selectedTicket, status: status as any });
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    // Handle ticket selection
    const handleTicketSelect = (ticket: RiderSupportTicket) => {
        setSelectedTicket(ticket);
        setView('chat');

        // Auto-assign ticket if not assigned
        if (!ticket.assigned_to && user) {
            assignTicket.mutate({
                ticketId: ticket.id,
                adminId: user.id
            });
        }
    };

    // Get status badge
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

    // Get priority badge
    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return <Badge variant="destructive">Urgent</Badge>;
            case 'high':
                return <Badge className="bg-red-500/20 text-red-400">High</Badge>;
            case 'medium':
                return <Badge className="bg-yellow-500/20 text-yellow-400">Medium</Badge>;
            case 'low':
                return <Badge className="bg-green-500/20 text-green-400">Low</Badge>;
            default:
                return null;
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-200px)] gap-4">
            {/* Ticket List */}
            <div className={`${view === 'chat' ? 'hidden md:block w-1/3' : 'w-full'} border rounded-lg overflow-hidden`}>
                <div className="p-4 border-b bg-gray-50 dark:bg-gray-800">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Rider Support Tickets
                        <Badge variant="secondary" className="ml-auto">
                            {filteredTickets.length}
                        </Badge>
                    </h3>

                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search tickets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-3 py-2 border rounded-md text-sm"
                        >
                            <option value="all">All</option>
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                </div>

                <ScrollArea className="h-[calc(100%-120px)]">
                    {filteredTickets.length > 0 ? (
                        <div className="divide-y">
                            {filteredTickets.map((ticket) => (
                                <button
                                    key={ticket.id}
                                    onClick={() => handleTicketSelect(ticket)}
                                    className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedTicket?.id === ticket.id ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-medium text-sm truncate">{ticket.subject}</h4>
                                                {getPriorityBadge(ticket.priority)}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {ticket.category.replace(/_/g, ' ')}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                {getStatusBadge(ticket.status)}
                                                <span className="text-xs text-gray-400">
                                                    {formatTimeAgo(ticket.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p>No support tickets found</p>
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* Chat View */}
            {view === 'chat' && selectedTicket && (
                <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
                    {/* Chat Header */}
                    <div className="p-4 border-b bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setView('list');
                                        setSelectedTicket(null);
                                    }}
                                    className="md:hidden"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div>
                                    <h3 className="font-semibold">{selectedTicket.subject}</h3>
                                    <p className="text-xs text-gray-500">
                                        {selectedTicket.category.replace(/_/g, ' ')} •
                                        Created {format(new Date(selectedTicket.created_at), 'MMM d, yyyy')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {getStatusBadge(selectedTicket.status)}
                                {getPriorityBadge(selectedTicket.priority)}
                            </div>
                        </div>

                        {/* Rider Info */}
                        {riderInfo && (
                            <div className="mt-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-200 dark:bg-purple-700 flex items-center justify-center">
                                    <User className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{riderInfo.name || 'Rider'}</p>
                                    <p className="text-xs text-gray-500">{riderInfo.phone}</p>
                                </div>
                                {riderInfo.rating && (
                                    <div className="flex items-center gap-1">
                                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                        <span className="text-xs">{riderInfo.rating.toFixed(1)}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Status Actions */}
                        <div className="mt-3 flex gap-2">
                            {selectedTicket.status === 'open' && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleStatusUpdate('in_progress')}
                                    className="text-xs"
                                >
                                    Start Working
                                </Button>
                            )}
                            {selectedTicket.status === 'in_progress' && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleStatusUpdate('resolved')}
                                    className="text-xs"
                                >
                                    Mark Resolved
                                </Button>
                            )}
                            {selectedTicket.status === 'resolved' && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleStatusUpdate('closed')}
                                    className="text-xs"
                                >
                                    Close Ticket
                                </Button>
                            )}
                            {selectedTicket.status === 'closed' && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleStatusUpdate('open')}
                                    className="text-xs"
                                >
                                    Reopen Ticket
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-3">
                            {messagesLoading ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                                </div>
                            ) : messages && messages.length > 0 ? (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] p-3 rounded-xl ${msg.sender_type === 'admin'
                                                ? 'bg-purple-600 text-white'
                                                : msg.sender_type === 'system'
                                                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-center w-full'
                                                    : 'bg-slate-200 dark:bg-slate-700 text-gray-900 dark:text-gray-100'
                                                }`}
                                        >
                                            {msg.sender_type === 'system' ? (
                                                <p className="text-xs">{msg.message}</p>
                                            ) : (
                                                <>
                                                    <p className="text-xs font-medium mb-1 opacity-70">
                                                        {msg.sender_type === 'admin' ? 'You (Admin)' : 'Rider'}
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
                                <div className="text-center py-8 text-gray-500">
                                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No messages yet</p>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>

                    {/* Message Input */}
                    {selectedTicket.status !== 'closed' && (
                        <div className="p-4 border-t">
                            <div className="flex gap-2">
                                <Textarea
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Type your reply..."
                                    className="min-h-[60px]"
                                />
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={!messageInput.trim() || sendMessage.isPending}
                                    className="self-end"
                                >
                                    {sendMessage.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
