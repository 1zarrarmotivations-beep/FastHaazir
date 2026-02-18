import { useState } from "react";
import { motion } from "framer-motion";
import {
    Search,
    CheckCircle,
    XCircle,
    Clock,
    FileText,
    User,
    Bike,
    Shield,
    Eye,
    AlertTriangle,
    Calendar
} from "lucide-react";
import { safeLower } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAdminRiderApplications, useReviewRiderApplication } from "@/hooks/useAdmin";
import { format } from "date-fns";

// Helper for parsing notes safely
const parseNotes = (notes: string | null) => {
    if (!notes) return {};
    try {
        const parsed = JSON.parse(notes);
        // Handle case where parsed is string (double stringified)
        if (typeof parsed === 'string') return JSON.parse(parsed);
        return parsed;
    } catch (e) {
        return {};
    }
};

function DocumentPreview({ label, url }: { label: string, url?: string }) {
    if (!url) return (
        <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
            <div className="h-32 rounded-lg bg-muted/50 flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20">
                <AlertTriangle className="w-5 h-5 text-muted-foreground/50 mb-1" />
                <span className="text-[10px] text-muted-foreground/70">Not Provided</span>
            </div>
        </div>
    );

    return (
        <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
            <div
                className="h-32 rounded-lg overflow-hidden border border-border cursor-pointer group relative bg-black/5"
                onClick={() => window.open(url, '_blank')}
            >
                <img src={url} alt={label} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white" />
                </div>
            </div>
        </div>
    );
}

export function RiderApplicationsManager() {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);

    const { data: applications, isLoading } = useAdminRiderApplications();
    const reviewApplication = useReviewRiderApplication();

    const filteredApps = applications?.filter((app: any) => {
        const notes = parseNotes(app.notes);
        const name = notes.name || app.user?.full_name || "Unknown";
        const phone = notes.phone || app.user?.phone || "";

        const matchesSearch =
            safeLower(name).includes(safeLower(searchQuery)) ||
            safeLower(phone).includes(safeLower(searchQuery));

        const matchesStatus = statusFilter === "all" || app.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const handleReview = (status: 'approved' | 'rejected') => {
        if (!selectedApp) return;
        reviewApplication.mutate({ applicationId: selectedApp.id, status }, {
            onSuccess: () => setViewDialogOpen(false)
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Approved</Badge>;
            case 'rejected':
                return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Rejected</Badge>;
            default:
                return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Pending</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <h2 className="text-lg font-semibold">Rider Applications</h2>

                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-9"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-32 h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-6">
                                <div className="h-32 bg-muted rounded-lg" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredApps?.map((app: any, index: number) => {
                        const notes = parseNotes(app.notes); // Already parsed data
                        const riderName = notes.name || app.user?.full_name || "Unknown Applicant";
                        const riderPhone = notes.phone || app.user?.phone || "No Phone";

                        return (
                            <motion.div
                                key={app.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card
                                    className="hover:shadow-md transition-all cursor-pointer group"
                                    onClick={() => {
                                        setSelectedApp(app);
                                        setViewDialogOpen(true);
                                    }}
                                >
                                    <CardContent className="p-5">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                    {riderName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-sm">{riderName}</h3>
                                                    <p className="text-xs text-muted-foreground">{riderPhone}</p>
                                                </div>
                                            </div>
                                            {getStatusBadge(app.status)}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
                                            <div className="flex items-center gap-1.5 bg-muted/30 p-1.5 rounded">
                                                <Bike className="w-3.5 h-3.5" />
                                                <span>{app.vehicle_type || 'Unknown Vehicle'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-muted/30 p-1.5 rounded">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span>{app.experience_years ? `${app.experience_years} Years` : 'Fresh'}</span>
                                            </div>
                                            <div className="col-span-2 flex items-center gap-1.5 bg-muted/30 p-1.5 rounded">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>Applied: {format(new Date(app.created_at), 'MMM d, yyyy h:mm a')}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-2 border-t border-dashed">
                                            <Button size="sm" variant="ghost" className="text-xs h-7 gap-1 group-hover:text-primary">
                                                View Details <Eye className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}

                    {(!filteredApps || filteredApps.length === 0) && (
                        <div className="col-span-full py-12 text-center text-muted-foreground">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No rider applications found matching your filters.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Detail Dialog */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Application Details</DialogTitle>
                        <DialogDescription>
                            Review rider application data and documents.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedApp && (() => {
                        const notes = parseNotes(selectedApp.notes);
                        const riderName = notes.name || selectedApp.user?.full_name || "Unknown";
                        const riderPhone = notes.phone || selectedApp.user?.phone || "No Phone";

                        return (
                            <div className="space-y-6 py-2">
                                {/* Status Bar */}
                                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                                    <div className="flex items-center gap-3">
                                        <User className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="font-semibold">{riderName}</p>
                                            <p className="text-sm text-muted-foreground">{riderPhone}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right text-sm">
                                            <p className="text-muted-foreground text-xs">Application Status</p>
                                            <div className="font-medium capitalize">{selectedApp.status}</div>
                                        </div>
                                        {getStatusBadge(selectedApp.status)}
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="p-3 border rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">Vehicle Type</p>
                                        <div className="flex items-center gap-2">
                                            <Bike className="w-4 h-4 text-primary" />
                                            <span className="font-medium">{selectedApp.vehicle_type}</span>
                                        </div>
                                    </div>
                                    <div className="p-3 border rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">Experience</p>
                                        <div className="flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-primary" />
                                            <span className="font-medium">{selectedApp.experience_years} Years</span>
                                        </div>
                                    </div>
                                    <div className="p-3 border rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">License Number</p>
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-primary" />
                                            <span className="font-medium">{selectedApp.license_number || notes.license_number || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div className="p-3 border rounded-lg sm:col-span-3">
                                        <p className="text-xs text-muted-foreground mb-1">CNIC Number</p>
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-primary" />
                                            <span className="font-medium font-mono tracking-wide">{notes.cnic || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Documents */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Documents
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <DocumentPreview label="CNIC Front" url={notes.cnic_front} />
                                        <DocumentPreview label="CNIC Back" url={notes.cnic_back} />
                                        <DocumentPreview label="Driving License" url={notes.license_image} />
                                    </div>
                                </div>

                                <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
                                    {selectedApp.status === 'pending' ? (
                                        <>
                                            <Button
                                                variant="outline"
                                                className="text-destructive border-destructive/20 hover:bg-destructive/10"
                                                onClick={() => handleReview('rejected')}
                                                disabled={reviewApplication.isPending}
                                            >
                                                <XCircle className="w-4 h-4 mr-2" />
                                                Reject Application
                                            </Button>
                                            <Button
                                                className="gradient-primary text-primary-foreground"
                                                onClick={() => handleReview('approved')}
                                                disabled={reviewApplication.isPending}
                                            >
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Approve & Activate Rider
                                            </Button>
                                        </>
                                    ) : (
                                        <Button variant="secondary" onClick={() => setViewDialogOpen(false)}>
                                            Close
                                        </Button>
                                    )}
                                </DialogFooter>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    );
}
