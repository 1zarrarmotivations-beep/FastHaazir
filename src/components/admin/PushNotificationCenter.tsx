import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Bell, Send, Users, Clock, CheckCircle, XCircle, AlertTriangle, Smartphone } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PushNotification {
  id: string;
  title: string;
  message: string;
  target_role: string | null;
  target_user_id: string | null;
  action_route: string | null;
  sent_at: string;
  success_count: number;
  failure_count: number;
}

interface TokenStats {
  total: number;
  customers: number;
  riders: number;
  businesses: number;
  admins: number;
}

const PushNotificationCenter = () => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState<string>('all');
  const [actionRoute, setActionRoute] = useState('');

  // Fetch token stats by role
  const { data: tokenStats, isLoading: statsLoading } = useQuery({
    queryKey: ['push-token-stats'],
    queryFn: async () => {
      // Get all device tokens with their user roles
      const { data: tokens, error } = await supabase
        .from('push_device_tokens')
        .select('user_id');
      
      if (error) throw error;
      
      const userIds = [...new Set(tokens?.map(t => t.user_id) || [])];
      
      if (userIds.length === 0) {
        return { total: 0, customers: 0, riders: 0, businesses: 0, admins: 0 };
      }
      
      // Get roles for these users
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);
      
      const roleMap = new Map<string, string>();
      roles?.forEach(r => roleMap.set(r.user_id, r.role));
      
      const stats: TokenStats = { total: userIds.length, customers: 0, riders: 0, businesses: 0, admins: 0 };
      
      userIds.forEach(uid => {
        const role = roleMap.get(uid) || 'customer';
        if (role === 'rider') stats.riders++;
        else if (role === 'business') stats.businesses++;
        else if (role === 'admin') stats.admins++;
        else stats.customers++;
      });
      
      return stats;
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  // Fetch notification history
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['push-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('push_notifications')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as PushNotification[];
    },
  });

  // Get target count based on selection
  const targetCount = useMemo(() => {
    if (!tokenStats) return 0;
    switch (targetRole) {
      case 'rider': return tokenStats.riders;
      case 'customer': return tokenStats.customers;
      case 'business': return tokenStats.businesses;
      case 'admin': return tokenStats.admins;
      default: return tokenStats.total;
    }
  }, [targetRole, tokenStats]);

  // Send notification mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('send-push-notification', {
        body: {
          title,
          message,
          targetRole: targetRole === 'all' ? null : targetRole,
          actionRoute: actionRoute || null,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Push sent to ${data.sent} devices`);
      setTitle('');
      setMessage('');
      setActionRoute('');
      queryClient.invalidateQueries({ queryKey: ['push-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['push-token-stats'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to send: ${error.message}`);
    },
  });

  const handleSend = () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    if (targetCount === 0) {
      toast.error('No registered devices found for this audience');
      return;
    }
    sendMutation.mutate();
  };

  const getTargetLabel = (role: string | null) => {
    if (!role) return 'All Users';
    return role.charAt(0).toUpperCase() + role.slice(1) + 's';
  };

  return (
    <div className="space-y-6">
      {/* Token Stats Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4" />
            Registered Devices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <p className="text-sm text-muted-foreground">Loading stats...</p>
          ) : tokenStats?.total === 0 ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No devices registered. Ask users to open the app and allow notifications.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-lg font-bold">{tokenStats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-lg font-bold">{tokenStats?.customers || 0}</p>
                <p className="text-xs text-muted-foreground">Customers</p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-lg font-bold">{tokenStats?.riders || 0}</p>
                <p className="text-xs text-muted-foreground">Riders</p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-lg font-bold">{tokenStats?.businesses || 0}</p>
                <p className="text-xs text-muted-foreground">Businesses</p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-lg font-bold">{tokenStats?.admins || 0}</p>
                <p className="text-xs text-muted-foreground">Admins</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Send Push Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Notification title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target">Target Audience</Label>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      All Users ({tokenStats?.total || 0})
                    </div>
                  </SelectItem>
                  <SelectItem value="customer">Customers ({tokenStats?.customers || 0})</SelectItem>
                  <SelectItem value="rider">Riders ({tokenStats?.riders || 0})</SelectItem>
                  <SelectItem value="business">Businesses ({tokenStats?.businesses || 0})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Enter notification message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="route">Deep Link Route (Optional)</Label>
            <Input
              id="route"
              placeholder="/orders, /profile, etc."
              value={actionRoute}
              onChange={(e) => setActionRoute(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Users will be navigated to this route when they tap the notification
            </p>
          </div>

          {targetCount === 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No registered devices found for {getTargetLabel(targetRole === 'all' ? null : targetRole)}.
                Users must open the app and allow notifications first.
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleSend} 
            disabled={sendMutation.isPending || targetCount === 0}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {sendMutation.isPending 
              ? 'Sending...' 
              : `Send to ${targetCount} device${targetCount !== 1 ? 's' : ''}`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Notification History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-4">Loading...</p>
          ) : notifications?.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No notifications sent yet</p>
          ) : (
            <div className="space-y-3">
              {notifications?.map((notif) => (
                <div 
                  key={notif.id} 
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{notif.title}</h4>
                      <p className="text-sm text-muted-foreground">{notif.message}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        {notif.success_count}
                      </span>
                      {notif.failure_count > 0 && (
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-3 w-3" />
                          {notif.failure_count}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>To: {getTargetLabel(notif.target_role)}</span>
                    <span>{format(new Date(notif.sent_at), 'MMM d, h:mm a')}</span>
                    {notif.action_route && (
                      <span>Route: {notif.action_route}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PushNotificationCenter;