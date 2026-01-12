import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSendSystemNotification, useAdminCustomers } from '@/hooks/useAdmin';
import { Bell, Send, Users } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export function SystemNotifications() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const sendNotification = useSendSystemNotification();
  const { data: customers, isLoading } = useAdminCustomers();

  const handleSend = () => {
    if (!title.trim() || !message.trim()) {
      return;
    }

    sendNotification.mutate({
      title,
      message,
      userIds: sendToAll ? undefined : selectedUsers,
    }, {
      onSuccess: () => {
        setTitle('');
        setMessage('');
        setSelectedUsers([]);
      },
    });
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Send System Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Notification Title</Label>
            <Input
              id="title"
              placeholder="e.g., 🎉 Special Offer!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Enter your notification message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="sendToAll"
              checked={sendToAll}
              onCheckedChange={(checked) => setSendToAll(!!checked)}
            />
            <Label htmlFor="sendToAll" className="cursor-pointer">
              Send to all customers
            </Label>
          </div>

          <Button
            className="w-full"
            onClick={handleSend}
            disabled={!title.trim() || !message.trim() || sendNotification.isPending || (!sendToAll && selectedUsers.length === 0)}
          >
            <Send className="w-4 h-4 mr-2" />
            {sendNotification.isPending ? 'Sending...' : 'Send Notification'}
          </Button>
        </CardContent>
      </Card>

      {!sendToAll && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-primary" />
              Select Recipients ({selectedUsers.length} selected)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">Loading customers...</div>
            ) : customers && customers.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleUser(customer.user_id)}
                  >
                    <Checkbox
                      checked={selectedUsers.includes(customer.user_id)}
                      onCheckedChange={() => toggleUser(customer.user_id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {customer.name || 'Unknown User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {customer.email || 'No email'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No customers found</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}