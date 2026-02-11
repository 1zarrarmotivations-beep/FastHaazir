import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { MessageSquare, Send, Search, Filter, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

interface SupportTicket {
    id: string;
    user_id: string;
    subject: string;
    category: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    created_at: string;
    updated_at: string;
    user?: {
        email: string;
        phone: string;
    };
}

interface SupportMessage {
    id: string;
    ticket_id: string;
    sender_id: string | null;
    message: string;
    is_admin: boolean;
    created_at: string;
}

const AdminSupportManager = () => {
    const queryClient = useQueryClient();
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch all tickets
    const { data: tickets, isLoading: loadingTickets } = useQuery({
        queryKey: ['admin-support-tickets'],
        queryFn: async () => {
            // Note: We might want to join with profiles to get user details, 
            // but for now we'll just get the raw tickets or join if possible.
            // Since we don't have the types for joins easily set up for this new table,
            // we will just fetch tickets.
            const { data, error } = await (supabase as any)
                .from('support_tickets')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            return data as unknown as SupportTicket[];
        },
    });

    // Fetch messages for selected ticket
    const { data: messages, isLoading: loadingMessages } = useQuery({
        queryKey: ['admin-support-messages', selectedTicketId],
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
    });

    // Send message mutation
    const sendMessageMutation = useMutation({
        mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
            const { error } = await (supabase as any)
                .from('support_messages')
                .insert({
                    ticket_id: ticketId,
                    message,
                    is_admin: true, // Mark as admin message
                });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-support-messages', selectedTicketId] });
            setNewMessage('');
        },
        onError: () => toast.error('Failed to send message'),
    });

    // Update status mutation
    const updateStatusMutation = useMutation({
        mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
            const { error } = await (supabase as any)
                .from('support_tickets')
                .update({ status })
                .eq('id', ticketId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
            toast.success('Ticket status updated');
        },
    });

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedTicketId) return;
        sendMessageMutation.mutate({ ticketId: selectedTicketId, message: newMessage });
    };

    const filteredTickets = tickets?.filter(ticket => {
        if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
        if (searchQuery) {
            return ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ticket.id.includes(searchQuery);
        }
        return true;
    });

    const selectedTicket = tickets?.find(t => t.id === selectedTicketId);

    const statusColors: Record<string, string> = {
        open: 'bg-green-100 text-green-800',
        in_progress: 'bg-blue-100 text-blue-800',
        resolved: 'bg-gray-100 text-gray-800',
        closed: 'bg-red-100 text-red-800',
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
            {/* Ticket List */}
            <Card className="lg:col-span-1 flex flex-col h-full">
                <CardHeader className="p-4 border-b">
                    <div className="flex items-center justify-between mb-4">
                        <CardTitle className="text-lg">Support Tickets</CardTitle>
                        <Badge variant="outline">{filteredTickets?.length || 0}</Badge>
                    </div>
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search tickets..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {loadingTickets ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredTickets?.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No tickets found.
                        </div>
                    ) : (
                        filteredTickets?.map((ticket) => (
                            <div
                                key={ticket.id}
                                onClick={() => setSelectedTicketId(ticket.id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50 ${selectedTicketId === ticket.id ? 'bg-accent border-primary/50' : 'bg-card'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-semibold text-sm line-clamp-1">{ticket.subject}</h4>
                                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${statusColors[ticket.status]}`}>
                                        {ticket.status}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-end text-xs text-muted-foreground">
                                    <span>{ticket.category}</span>
                                    <span>{format(new Date(ticket.updated_at), 'MMM d, HH:mm')}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>

            {/* Ticket Detail & Chat */}
            <Card className="lg:col-span-2 flex flex-col h-full">
                {selectedTicket ? (
                    <>
                        <CardHeader className="p-4 border-b bg-muted/10 shrink-0">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold">{selectedTicket.subject}</h3>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <AlertCircle className="w-4 h-4" /> {selectedTicket.category}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" /> {format(new Date(selectedTicket.created_at), 'MMM d, yyyy HH:mm')}
                                        </span>
                                    </div>
                                </div>
                                <Select
                                    value={selectedTicket.status}
                                    onValueChange={(val) => updateStatusMutation.mutate({ ticketId: selectedTicket.id, status: val })}
                                >
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="open">Open</SelectItem>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="resolved">Resolved</SelectItem>
                                        <SelectItem value="closed">Closed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/5">
                            {loadingMessages ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                messages?.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-2xl p-3 ${msg.is_admin
                                                ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                : 'bg-white border text-foreground rounded-tl-none'
                                                }`}
                                        >
                                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                            <p className={`text-[10px] mt-1 ${msg.is_admin ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                                {msg.is_admin ? 'You' : 'User'} • {format(new Date(msg.created_at), 'MMM d, HH:mm')}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t bg-background mt-auto">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <Textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your reply..."
                                    className="min-h-[60px] resize-none"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(e);
                                        }
                                    }}
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    className="h-[60px] w-[60px]"
                                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                                >
                                    {sendMessageMutation.isPending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </Button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Select a ticket to view details</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AdminSupportManager;
