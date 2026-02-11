/**
 * Real-Time Users Component
 * Shows currently active users with live updates
 */

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActiveUser {
    user_id: string;
    current_page: string;
    last_seen: string;
}

interface Props {
    data: ActiveUser[];
}

export function RealTimeUsers({ data }: Props) {
    if (data.length === 0) {
        return (
            <div className="text-center py-12">
                <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No active users right now</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Active count */}
            <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-500 animate-pulse" />
                    <span className="font-semibold">Active Users</span>
                </div>
                <Badge variant="secondary" className="text-lg font-bold">
                    {data.length}
                </Badge>
            </div>

            {/* User list */}
            <ScrollArea className="h-[400px] rounded-md border p-4">
                <div className="space-y-3">
                    {data.map((user, index) => (
                        <div
                            key={index}
                            className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                            <div className="flex items-start gap-3 flex-1">
                                <div className="p-2 rounded-full bg-green-500/10">
                                    <User className="w-4 h-4 text-green-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-mono text-sm text-muted-foreground truncate">
                                        {user.user_id.substring(0, 8)}...
                                    </p>
                                    <p className="text-sm font-medium mt-1 truncate">
                                        {user.current_page}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(new Date(user.last_seen), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0 mt-2" />
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
