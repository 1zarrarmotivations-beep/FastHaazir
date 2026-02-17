import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, UserX, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export function DeletionRequestsManager() {
    const queryClient = useQueryClient();

    const { data: requests, isLoading } = useQuery({
        queryKey: ['admin-deletion-requests'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('deletion_requests')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const { error } = await supabase
                .from('deletion_requests')
                .update({ status })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-deletion-requests'] });
            toast.success("Request updated");
        }
    });

    if (isLoading) return <div>Loading requests...</div>;

    return (
        <div className="space-y-6">
            <Card className="bg-orange-500/5 border-orange-500/20">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">Data Deletion Policy</h3>
                        <p className="text-sm text-muted-foreground">
                            These users have requested permanent deletion of their account and data.
                            As per Google Play policy, you must process these requests within a reasonable timeframe.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4">
                {requests?.length === 0 ? (
                    <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                        <UserX className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                        <p className="text-muted-foreground">No pending deletion requests</p>
                    </div>
                ) : (
                    requests?.map((request, index) => (
                        <motion.div
                            key={request.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${request.status === 'pending' ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'
                                                }`}>
                                                {request.status === 'pending' ? <Clock className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold">{request.email || request.phone || 'Anonymous User'}</h4>
                                                    <Badge variant={request.status === 'pending' ? 'outline' : 'default'} className={
                                                        request.status === 'pending' ? 'text-orange-500 border-orange-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                    }>
                                                        {request.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Requested on {new Date(request.created_at).toLocaleDateString()}
                                                </p>
                                                {request.reason && (
                                                    <p className="text-sm text-foreground/80 mt-2 bg-muted/30 p-2 rounded italic">
                                                        "{request.reason}"
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {request.status === 'pending' && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => updateStatus.mutate({ id: request.id, status: 'processed' })}
                                                        className="text-emerald-500 hover:text-emerald-600 border-emerald-500/20"
                                                    >
                                                        Mark Processed
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        className="gap-2"
                                                        onClick={() => toast.error("Permanent deletion must be done manually in Supabase Dashboard for security.")}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete Data
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
