/**
 * Conversions Table
 * Table showing conversion metrics
 */

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, UserPlus, ShoppingCart, CheckCircle, Store } from 'lucide-react';
import type { ConversionStats } from '@/hooks/useAnalytics';

interface Props {
    data: ConversionStats[];
}

const CONVERSION_ICONS = {
    signup: UserPlus,
    order_placed: ShoppingCart,
    order_completed: CheckCircle,
    rider_signup: TrendingUp,
    business_created: Store
};

const CONVERSION_LABELS = {
    signup: 'User Signups',
    order_placed: 'Orders Placed',
    order_completed: 'Orders Completed',
    rider_signup: 'Rider Signups',
    business_created: 'Businesses Created'
};

export function ConversionsTable({ data }: Props) {
    if (data.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No conversion data available
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Conversion Type</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((conversion, index) => {
                        const Icon = CONVERSION_ICONS[conversion.type as keyof typeof CONVERSION_ICONS] || TrendingUp;
                        const label = CONVERSION_LABELS[conversion.type as keyof typeof CONVERSION_LABELS] || conversion.type;

                        return (
                            <TableRow key={index}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4 text-primary" />
                                        <span className="font-medium">{label}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Badge variant="secondary" className="font-semibold">
                                        {conversion.count.toLocaleString()}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                    Rs. {conversion.value.toLocaleString()}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
