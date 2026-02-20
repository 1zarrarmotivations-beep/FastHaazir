import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Bike,
  Phone,
  Star,
  ToggleLeft,
  ToggleRight,
  User,
  CreditCard,
  Trash2,
  Percent,
  MapPin,
  FileCheck,
  AlertTriangle,
  Eye,
  Wallet,
  ArrowRight
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAdminRiders, useCreateRider, useToggleRiderStatus, useDeleteRider, useVerifyRider, useAdminUpdateRider } from "@/hooks/useAdmin";
import { useRiderAvailableBalance } from "@/hooks/useWithdrawals";

interface RidersManagerProps {
  onNavigate?: (tab: string, riderId?: string) => void;
}

function RiderBalanceBadge({ riderId }: { riderId: string }) {
  const { data: balance, isLoading } = useRiderAvailableBalance(riderId);

  if (isLoading) return <div className="h-4 w-16 bg-muted animate-pulse rounded mt-2" />;

  return (
    <div className="flex items-center gap-2 mt-2">
      <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20 text-[10px] py-0 h-5">
        Rs {balance?.available?.toLocaleString() || 0} Available
      </Badge>
      {balance?.pending > 0 && (
        <Badge variant="outline" className="bg-orange-500/5 text-orange-600 border-orange-500/20 text-[10px] py-0 h-5">
          Rs {balance.pending.toLocaleString()} Pending
        </Badge>
      )}
    </div>
  );
}

function DocumentPreview({ label, url }: { label: string, url?: string }) {
  if (!url) return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="h-40 rounded-lg bg-muted flex items-center justify-center border-2 border-dashed">
        <AlertTriangle className="w-5 h-5 text-muted-foreground mr-2" />
        <span className="text-xs text-muted-foreground">Missing Document</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div
        className="h-40 rounded-lg overflow-hidden border border-border cursor-pointer group relative"
        onClick={() => window.open(url, '_blank')}
      >
        <img src={url} alt={label} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Eye className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export function RidersManager({ onNavigate }: RidersManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked" | "online" | "pending">("all");
  const [newRider, setNewRider] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    cnic: "",
    vehicle_type: "Bike",
    commission_rate: 10,
  });
  const [selectedRider, setSelectedRider] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [docDialogOpen, setDocDialogOpen] = useState(false);

  const { data: riders, isLoading } = useAdminRiders();
  const createRider = useCreateRider();
  const updateRider = useAdminUpdateRider();
  const toggleStatus = useToggleRiderStatus();
  const deleteRider = useDeleteRider();

  const filteredRiders = (riders as any[])?.filter((rider) => {
    const matchesSearch = safeLower(rider.name).includes(safeLower(searchQuery)) ||
      safeLower(rider.phone).includes(safeLower(searchQuery));

    if (!matchesSearch) return false;

    switch (statusFilter) {
      case "active":
        return rider.is_active && rider.verification_status === 'verified';
      case "blocked":
        return !rider.is_active;
      case "online":
        return rider.is_online;
      case "pending":
        return rider.verification_status === 'pending';
      default:
        return true;
    }
  });

  const verifyRider = useVerifyRider();



  const handleUpdateRider = () => {
    if (!selectedRider || !selectedRider.name || !selectedRider.phone) return;

    // Normalize phone to +923XXXXXXXXX
    let phoneDigits = selectedRider.phone.replace(/\D/g, "");
    // If it's short (just edited digits 3XXXXXXXXX), prefix 92
    if (phoneDigits.length === 10) {
      phoneDigits = "92" + phoneDigits;
    } else if (phoneDigits.startsWith("03")) {
      phoneDigits = "92" + phoneDigits.slice(1);
    }

    // Ensure we have at least 12 digits (92 + 10 digits)
    // Actually just enforce last 10 approach for maximum robustness
    const last10 = phoneDigits.slice(-10);
    if (last10.length < 10) {
      alert("Invalid phone number length.");
      return;
    }
    const finalPhone = `+92${last10}`;

    updateRider.mutate({
      id: selectedRider.id,
      userId: selectedRider.user_id,
      name: selectedRider.name,
      phone: finalPhone,
      email: selectedRider.email,
      cnic: selectedRider.cnic,
      vehicle_type: selectedRider.vehicle_type,
      commission_rate: selectedRider.commission_rate,
      password: selectedRider.password || undefined // Only send if set
    }, {
      onSuccess: () => {
        setEditDialogOpen(false);
        setSelectedRider(null);
      }
    });
  };

  const formatPhone = (phone: string | null | undefined) => {
    if (!phone) return "N/A";
    const digits = phone.replace(/\D/g, "");
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)}-${digits.slice(4, 11)}`;
  };

  // Stats
  const totalRiders = riders?.length || 0;
  const activeRiders = riders?.filter(r => r.is_active).length || 0;
  const onlineRiders = riders?.filter(r => r.is_online).length || 0;
  const blockedRiders = riders?.filter(r => !r.is_active).length || 0;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalRiders}</p>
                <p className="text-xs text-muted-foreground">Total Riders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Bike className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{activeRiders}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{onlineRiders}</p>
                <p className="text-xs text-muted-foreground">Online Now</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                <ToggleLeft className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{blockedRiders}</p>
                <p className="text-xs text-muted-foreground">Blocked</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-1 gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: typeof statusFilter) => setStatusFilter(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground gap-2">
              <Plus className="w-4 h-4" />
              Add Rider
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Rider</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter rider name"
                  value={newRider.name}
                  onChange={(e) => setNewRider({ ...newRider, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number * (Login via OTP)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">+92</span>
                  <Input
                    id="phone"
                    className="pl-10"
                    placeholder="3XXXXXXXXX"
                    value={newRider.phone.replace(/^\+?92|^0/, '')}
                    onChange={(e) => {
                      // Allow only digits
                      const digits = e.target.value.replace(/\D/g, '');
                      // Limit to 10 digits (after 92) if possible, but let user type
                      setNewRider({ ...newRider, phone: digits.slice(0, 10) })
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter 3XXXXXXXXX (e.g. 3001234567). System auto-formats to +923001234567.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (Login via Email)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="rider@example.com"
                  value={newRider.email}
                  onChange={(e) => setNewRider({ ...newRider, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password (Optional)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Set login password"
                  value={newRider.password}
                  onChange={(e) => setNewRider({ ...newRider, password: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  If set, rider can login with Email + Password immediately.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnic">CNIC (Optional)</Label>
                <Input
                  id="cnic"
                  placeholder="XXXXX-XXXXXXX-X"
                  value={newRider.cnic}
                  onChange={(e) => setNewRider({ ...newRider, cnic: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle">Vehicle Type</Label>
                  <Select
                    value={newRider.vehicle_type}
                    onValueChange={(value) => setNewRider({ ...newRider, vehicle_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bike">Bike</SelectItem>
                      <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                      <SelectItem value="Car">Car</SelectItem>
                      <SelectItem value="Van">Van</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission">Commission %</Label>
                  <Input
                    id="commission"
                    type="number"
                    min="0"
                    max="100"
                    value={newRider.commission_rate}
                    onChange={(e) => setNewRider({ ...newRider, commission_rate: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  // Manual validation and formatting
                  const raw = newRider.phone.replace(/\D/g, '');
                  // Ensure it has at least 10 digits
                  if (raw.length < 10) {
                    alert("Please enter a valid 10-digit mobile number (excluding 0/92).");
                    return;
                  }
                  // Format to +923XXXXXXXXX
                  const formattedPhone = `+92${raw.slice(-10)}`;

                  createRider.mutate({
                    ...newRider,
                    phone: formattedPhone
                  }, {
                    onSuccess: () => {
                      setDialogOpen(false);
                      setNewRider({ name: "", phone: "", email: "", password: "", cnic: "", vehicle_type: "Bike", commission_rate: 10 });
                    },
                  });
                }}
                className="w-full gradient-primary text-primary-foreground"
                disabled={createRider.isPending || !newRider.name || !newRider.phone}
              >
                {createRider.isPending ? "Creating..." : "Create Rider (+92 Format)"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Riders Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-muted rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRiders?.map((rider, index) => (
            <motion.div
              key={rider.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="overflow-hidden hover:shadow-card transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {rider.image ? (
                        <img
                          src={rider.image}
                          alt={rider.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <User className="w-7 h-7 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {rider.name}
                        </h3>
                        <div className="flex gap-1">
                          <div className="flex flex-wrap gap-1 justify-end">
                            {rider.verification_status === 'pending' && (
                              <Badge className="bg-amber-500/20 text-amber-600 border-amber-200">
                                Pending
                              </Badge>
                            )}
                            {rider.is_online && (
                              <Badge className="bg-accent text-accent-foreground text-xs">
                                Online
                              </Badge>
                            )}
                            <Badge
                              variant={rider.is_active ? "default" : "secondary"}
                              className={rider.is_active ? "bg-accent/20 text-accent" : ""}
                            >
                              {rider.is_active ? "Active" : "Blocked"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground font-mono">
                        <Phone className="w-3 h-3" />
                        <span>{rider.phone}</span>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <div className="flex items-center gap-1">
                          <Bike className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{rider.vehicle_type}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-500" />
                          <span className="text-foreground font-medium">{rider.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Percent className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{rider.commission_rate || 10}%</span>
                        </div>
                      </div>

                      {rider.cnic && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <CreditCard className="w-3 h-3" />
                          <span>{rider.cnic}</span>
                        </div>
                      )}

                      <RiderBalanceBadge riderId={rider.id} />
                    </div>
                  </div>



                  {/* Edit Dialog */}
                  <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Rider</DialogTitle>
                      </DialogHeader>
                      {selectedRider && (
                        <div className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input
                              value={selectedRider.name}
                              onChange={(e) => setSelectedRider({ ...selectedRider, name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">+92</span>
                              <Input
                                className="pl-10"
                                value={selectedRider.phone.replace(/^\+?92|^0/, '')}
                                onChange={(e) => {
                                  const digits = e.target.value.replace(/\D/g, '');
                                  setSelectedRider({ ...selectedRider, phone: digits.slice(0, 10) })
                                }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Edit digits only (3XXXXXXXXX). Saved as +92...
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                              value={selectedRider.email || ''}
                              onChange={(e) => setSelectedRider({ ...selectedRider, email: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>New Password (Optional)</Label>
                            <Input
                              type="password"
                              placeholder="Leave blank to keep current"
                              value={selectedRider.password || ''}
                              onChange={(e) => setSelectedRider({ ...selectedRider, password: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Vehicle Type</Label>
                            <Select
                              value={selectedRider.vehicle_type}
                              onValueChange={(value) => setSelectedRider({ ...selectedRider, vehicle_type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Bike">Bike</SelectItem>
                                <SelectItem value="Car">Car</SelectItem>
                                <SelectItem value="Van">Van</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Commission %</Label>
                            <Input
                              type="number"
                              value={selectedRider.commission_rate}
                              onChange={(e) => setSelectedRider({ ...selectedRider, commission_rate: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                          <Button
                            onClick={handleUpdateRider}
                            className="w-full gradient-primary text-primary-foreground"
                            disabled={updateRider.isPending}
                          >
                            {updateRider.isPending ? "Updating..." : "Update Rider"}
                          </Button>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <span className="text-sm text-muted-foreground">
                      {rider.total_trips} trips completed
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedRider({ ...rider, password: '' }); // Clear password field for edit
                          setEditDialogOpen(true);
                        }}
                      >
                        <User className="w-4 h-4 text-blue-500" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-orange-500 hover:bg-orange-500/10"
                        onClick={() => onNavigate?.('wallet-adjustments', rider.id)}
                        title="Manage Finance"
                      >
                        <Wallet className="w-4 h-4" />
                      </Button>

                      {rider.verification_status === 'pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          onClick={() => {
                            setSelectedRider(rider);
                            setDocDialogOpen(true);
                          }}
                        >
                          <FileCheck className="w-4 h-4 mr-1" />
                          Verify
                        </Button>
                      )}
                      {rider.verification_status === 'verified' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedRider(rider);
                            setDocDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleStatus.mutate({
                          riderId: rider.id,
                          isActive: !rider.is_active
                        })}
                        className={rider.is_active ? "text-destructive" : "text-accent"}
                      >
                        {rider.is_active ? (
                          <>
                            <ToggleRight className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Rider</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {rider.name}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteRider.mutate(rider.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
          }
        </div >
      )}

      {/* Verification Dialog */}
      <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rider Verification Documents</DialogTitle>
          </DialogHeader>
          {selectedRider && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Full Name</h4>
                  <p className="text-lg font-bold">{selectedRider.name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">CNIC Number</h4>
                  <p className="text-lg font-bold">{selectedRider.cnic || 'Not provided'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium border-b pb-1">Identification Documents</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DocumentPreview label="CNIC Front" url={selectedRider.cnic_front} />
                  <DocumentPreview label="CNIC Back" url={selectedRider.cnic_back} />
                  <DocumentPreview label="Driving License" url={selectedRider.license_image} />
                </div>
              </div>

              {selectedRider.verification_status === 'pending' && (
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1 text-destructive border-destructive/20 hover:bg-destructive/5"
                    onClick={() => {
                      verifyRider.mutate({ riderId: selectedRider.id, status: 'rejected' });
                      setDocDialogOpen(false);
                    }}
                  >
                    Reject Application
                  </Button>
                  <Button
                    className="flex-1 gradient-primary text-primary-foreground"
                    onClick={() => {
                      verifyRider.mutate({ riderId: selectedRider.id, status: 'verified' });
                      setDocDialogOpen(false);
                    }}
                  >
                    Approve & Activate
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div >
  );
}




