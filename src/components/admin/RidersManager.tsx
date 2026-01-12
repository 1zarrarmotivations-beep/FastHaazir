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
  MapPin
} from "lucide-react";
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
import { useAdminRiders, useCreateRider, useToggleRiderStatus, useDeleteRider } from "@/hooks/useAdmin";

export function RidersManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked" | "online">("all");
  const [newRider, setNewRider] = useState({
    name: "",
    phone: "",
    email: "",
    cnic: "",
    vehicle_type: "Bike",
    commission_rate: 10,
  });

  const { data: riders, isLoading } = useAdminRiders();
  const createRider = useCreateRider();
  const toggleStatus = useToggleRiderStatus();
  const deleteRider = useDeleteRider();

  const filteredRiders = riders?.filter((rider) => {
    const matchesSearch = rider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rider.phone.includes(searchQuery);
    
    if (!matchesSearch) return false;
    
    switch (statusFilter) {
      case "active":
        return rider.is_active;
      case "blocked":
        return !rider.is_active;
      case "online":
        return rider.is_online;
      default:
        return true;
    }
  });

  const handleCreateRider = () => {
    if (!newRider.name || !newRider.phone) return;
    createRider.mutate(newRider, {
      onSuccess: () => {
        setDialogOpen(false);
        setNewRider({ name: "", phone: "", email: "", cnic: "", vehicle_type: "Bike", commission_rate: 10 });
      },
    });
  };

  const formatPhone = (phone: string) => {
    // Format: 03XX-XXXXXXX
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
                <Input
                  id="phone"
                  placeholder="03XX-XXXXXXX"
                  value={formatPhone(newRider.phone)}
                  onChange={(e) => setNewRider({ ...newRider, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (Login via Email/Google)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="rider@example.com"
                  value={newRider.email}
                  onChange={(e) => setNewRider({ ...newRider, email: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Rider can login with Phone OTP or Email/Google
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
                onClick={handleCreateRider} 
                className="w-full gradient-primary text-primary-foreground"
                disabled={createRider.isPending || !newRider.name || !newRider.phone}
              >
                {createRider.isPending ? "Creating..." : "Create Rider"}
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
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
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
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <span className="text-sm text-muted-foreground">
                      {rider.total_trips} trips completed
                    </span>
                    <div className="flex gap-2">
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
                            <ToggleRight className="w-4 h-4 mr-1" />
                            Block
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 mr-1" />
                            Unblock
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
          ))}
        </div>
      )}

      {filteredRiders?.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Bike className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No riders found</h3>
          <p className="text-muted-foreground">Add your first rider to get started</p>
        </div>
      )}
    </div>
  );
}
