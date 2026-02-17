import { useUnreadRiderTicketsCount } from "@/hooks/useAdminRiderSupport";
import { Badge } from "@/components/ui/badge";
import { Bike } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminRiderSupportNotificationBadgeProps {
    onTabChange: (tab: string) => void;
}

export default function AdminRiderSupportNotificationBadge({ onTabChange }: AdminRiderSupportNotificationBadgeProps) {
    const { data: count } = useUnreadRiderTicketsCount();

    if (!count || count === 0) return null;

    return (
        <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => onTabChange("rider-support")}
        >
            <Bike className="w-5 h-5 text-orange-500" />
            <Badge
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white border-2 border-background animate-pulse text-[10px]"
            >
                {count}
            </Badge>
        </Button>
    );
}
