/**
 * Errors Table Component
 * Shows recent application errors
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
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface ErrorData {
    error_type: string;
    error_message: string;
    created_at: string;
    page_path: string;
}

interface Props {
    data: ErrorData[];
}

export function ErrorsTable({ data }: Props) {
    if (data.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p>No errors reported - Great job!</p>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Error Type</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Page</TableHead>
                        <TableHead className="text-right">Time</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((error, index) => (
                        <TableRow key={index}>
                            <TableCell>
                                <AlertTriangle className="w-4 h-4 text-destructive" />
                            </TableCell>
                            <TableCell>
                                <Badge variant="destructive" className="font-mono text-xs">
                                    {error.error_type}
                                </Badge>
                            </TableCell>
                            <TableCell className="max-w-md truncate" title={error.error_message}>
                                {error.error_message}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                                {error.page_path}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                                {format(new Date(error.created_at), 'MMM dd, HH:mm')}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
