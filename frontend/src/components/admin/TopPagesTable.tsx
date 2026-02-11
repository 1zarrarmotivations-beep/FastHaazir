/**
 * Top Pages Table
 * Table showing most visited pages with metrics
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
import type { TopPage } from '@/hooks/useAnalytics';

interface Props {
    data: TopPage[];
}

export function TopPagesTable({ data }: Props) {
    if (data.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No page view data available
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Page Path</TableHead>
                        <TableHead className="text-right">Views</TableHead>
                        <TableHead className="text-right">Unique Visitors</TableHead>
                        <TableHead className="text-right">Avg. Duration</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((page, index) => (
                        <TableRow key={index}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell className="font-mono text-sm">
                                {page.path}
                            </TableCell>
                            <TableCell className="text-right">
                                <Badge variant="secondary">{page.views.toLocaleString()}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {page.uniqueVisitors.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                                {Math.floor(page.avgDuration / 60)}m {Math.floor(page.avgDuration % 60)}s
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
