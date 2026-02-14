import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Phone,
  User,
  Shield,
  ShieldCheck,
  Bike,
  Store,
  Trash2,
  UserCog
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { normalizePhoneNumber } from "@/lib/phoneUtils";

type RoleType = 'rider' | 'business' | 'admin';

interface UserEntry {
  id: string;
  type: RoleType;
  name: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

const roleIcons = {
  rider: Bike,
  business: Store,
  admin: ShieldCheck,
};

const roleColors = {
  rider: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  business: "bg-accent/10 text-accent border-accent/20",
  admin: "bg-primary/10 text-primary border-primary/20",
};

export function UsersManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"all" | RoleType>("all");
  const [newUser, setNewUser] = useState({
    name: "",
    phone: "",
    role: "rider" as RoleType,
  });

  const queryClient = useQueryClient();

  // Fetch all users with roles (riders + businesses + admins)
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Get all riders
      const { data: riders } = await supabase
        .from('riders')
        .select('id, name, phone, is_active, created_at')
        .order('created_at', { ascending: false });

      // Get all businesses with owner phone
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, name, owner_phone, is_active, created_at')
        .not('owner_phone', 'is', null)
        .order('created_at', { ascending: false });

      // Get all admins from admins table
      const { data: admins } = await supabase
        .from('admins')
        .select('id, phone, is_active, created_at')
        .order('created_at', { ascending: false });

      const allUsers: UserEntry[] = [];

      // Add admins
      admins?.forEach(a => {
        allUsers.push({
          id: a.id,
          type: 'admin',
          name: 'Admin',
          phone: a.phone || '',
          is_active: a.is_active ?? true,
          created_at: a.created_at,
        });
      });

      // Add riders
      riders?.forEach(r => {
        allUsers.push({
          id: r.id,
          type: 'rider',
          name: r.name || 'Unknown',
          phone: r.phone || '',
          is_active: r.is_active ?? true,
          created_at: r.created_at,
        });
      });

      // Add businesses
      businesses?.forEach(b => {
        if (b.owner_phone) {
          allUsers.push({
            id: b.id,
            type: 'business',
            name: b.name,
            phone: b.owner_phone,
            is_active: b.is_active ?? true,
            created_at: b.created_at,
          });
        }
      });

      // Sort by created_at
      return allUsers.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  });

  // Add new user with role
  const addUser = useMutation({
    mutationFn: async (data: { name: string; phone: string; role: RoleType }) => {
      const normalizedPhone = normalizePhoneNumber(data.phone);

      if (data.role === 'admin') {
        const { error } = await supabase.from('admins').insert({
          phone: normalizedPhone,
          is_active: true,
        });
        if (error) throw error;
      } else if (data.role === 'rider') {
        const { error } = await supabase.from('riders').insert({
          name: data.name,
          phone: normalizedPhone,
          is_active: true,
          verification_status: 'verified',
        });
        if (error) throw error;
      } else if (data.role === 'business') {
        const { error } = await supabase.from('businesses').insert({
          name: data.name,
          owner_phone: normalizedPhone,
          type: 'restaurant',
          is_active: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-riders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      const roleLabel = variables.role === 'admin' ? 'Admin' : variables.role === 'rider' ? 'Rider' : 'Business';
      toast.success(`${roleLabel} added! They can login with this number.`);
      setDialogOpen(false);
      setNewUser({ name: "", phone: "", role: "rider" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add user");
    }
  });

  // Delete user
  const deleteUser = useMutation({
    mutationFn: async (user: UserEntry) => {
      if (user.type === 'admin') {
        const { error } = await supabase.from('admins').delete().eq('id', user.id);
        if (error) throw error;
      } else if (user.type === 'rider') {
        const { error } = await supabase.from('riders').delete().eq('id', user.id);
        if (error) throw error;
      } else if (user.type === 'business') {
        const { error } = await supabase.from('businesses').delete().eq('id', user.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-riders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['online-riders'] });
      toast.success("User removed successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove user");
    }
  });

  const filteredUsers = users?.filter((user) => {
    const matchesSearch = (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.phone || '').includes(searchQuery);

    if (!matchesSearch) return false;
    if (roleFilter === "all") return true;
    return user.type === roleFilter;
  });

  const formatPhone = (phone: string | null | undefined) => {
    if (!phone) return "N/A";
    const digits = phone.replace(/\D/g, "");
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)}-${digits.slice(4, 11)}`;
  };

  // Stats
  const totalUsers = users?.length || 0;
  const adminCount = users?.filter(u => u.type === 'admin').length || 0;
  const riderCount = users?.filter(u => u.type === 'rider').length || 0;
  const businessCount = users?.filter(u => u.type === 'business').length || 0;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{adminCount}</p>
                <p className="text-xs text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Bike className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{riderCount}</p>
                <p className="text-xs text-muted-foreground">Riders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Store className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{businessCount}</p>
                <p className="text-xs text-muted-foreground">Businesses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-foreground">Role-Based Access Control</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Add phone numbers with roles. When users login with these numbers, they'll be automatically redirected to their respective dashboards.
                Changes take effect on next login.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
          <Select value={roleFilter} onValueChange={(v: typeof roleFilter) => setRoleFilter(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
              <SelectItem value="rider">Riders</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground gap-2">
              <Plus className="w-4 h-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add User with Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="role">Select Role *</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value: RoleType) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Admin</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="rider">
                      <div className="flex items-center gap-2">
                        <Bike className="w-4 h-4" />
                        <span>Rider</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="business">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        <span>Business Owner</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newUser.role !== 'admin' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder={newUser.role === 'rider' ? "Rider Name" : "Business Name"}
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number * (Login Number)</Label>
                <Input
                  id="phone"
                  placeholder="03XX-XXXXXXX"
                  value={formatPhone(newUser.phone)}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                />
                <p className="text-xs text-muted-foreground">
                  User will login with this number and access {
                    newUser.role === 'admin' ? 'Admin' :
                      newUser.role === 'rider' ? 'Rider' : 'Business'
                  } Dashboard
                </p>
              </div>
              <Button
                onClick={() => addUser.mutate(newUser)}
                className="w-full gradient-primary text-primary-foreground"
                disabled={addUser.isPending || (newUser.role !== 'admin' && !newUser.name) || !newUser.phone}
              >
                {addUser.isPending ? "Adding..." : "Add User"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers?.map((user, index) => {
            const Icon = roleIcons[user.type];
            const colorClass = roleColors[user.type];

            return (
              <motion.div
                key={`${user.type}-${user.id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="overflow-hidden hover:shadow-card transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground truncate">
                            {user.name}
                          </h3>
                          <Badge variant="outline" className={colorClass}>
                            {user.type === 'admin' ? 'Admin' : user.type === 'rider' ? 'Rider' : 'Business'}
                          </Badge>
                          {!user.is_active && (
                            <Badge variant="destructive">Blocked</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{formatPhone(user.phone)}</span>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {user.name}? This will revoke their access.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteUser.mutate(user)}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {filteredUsers?.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <UserCog className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No users found</h3>
          <p className="text-muted-foreground">Add phone numbers with roles to get started</p>
        </div>
      )}
    </div>
  );
}