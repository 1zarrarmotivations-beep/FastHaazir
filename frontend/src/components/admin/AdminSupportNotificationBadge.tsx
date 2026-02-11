import { useAdminSupportTickets } from "@/hooks/useAdminSupport";
import { Badge } from "@/components/ui/badge";
import { Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminSupportNotificationBadgeProps {
    onTabChange: (tab: string) => void;
}

export default function AdminSupportNotificationBadge({ onTabChange }: AdminSupportNotificationBadgeProps) {
    const { data: tickets } = useAdminSupportTickets();

    const openCount = tickets?.filter(t => t.status === 'open').length || 0;

    if (openCount === 0) return null;

    return (
        <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => onTabChange("support")}
        >
            <Headphones className="w-5 h-5 text-muted-foreground" />
            <Badge
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white border-2 border-background animate-pulse"
            >
                {openCount}
            </Badge>
        </Button>
    );
}
