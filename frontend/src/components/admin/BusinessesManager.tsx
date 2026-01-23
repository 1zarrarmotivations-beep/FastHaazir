import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Plus, 
  Search, 
  Store, 
  Star, 
  ToggleLeft, 
  ToggleRight,
  UtensilsCrossed,
  ShoppingCart,
  Cake,
  Package,
  Phone,
  Trash2,
  Percent,
  Menu,
  Award,
  Edit
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { 
  useAdminBusinesses, 
  useCreateBusiness,
  useUpdateBusiness,
  useToggleBusinessStatus, 
  useDeleteBusiness,
  useToggleBusinessFeatured 
} from "@/hooks/useAdmin";
import { MenuItemsManager } from "./MenuItemsManager";
import { ImageUpload } from "./ImageUpload";

const businessTypeIcons = {
  restaurant: UtensilsCrossed,
  grocery: ShoppingCart,
  bakery: Cake,
  shop: Package,
};

const businessTypeColors = {
  restaurant: "bg-primary/10 text-primary",
  grocery: "bg-accent/10 text-accent",
  bakery: "bg-amber-500/10 text-amber-600",
  shop: "bg-blue-500/10 text-blue-600",
};

export function BusinessesManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<{ id: string; name: string } | null>(null);
  const [editingBusiness, setEditingBusiness] = useState<any | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "restaurant" | "grocery" | "bakery" | "shop">("all");
  const [newBusiness, setNewBusiness] = useState({
    name: "",
    type: "restaurant" as 'restaurant' | 'grocery' | 'bakery' | 'shop',
    description: "",
    category: "",
    image: "",
    commission_rate: 15,
  });

  const { data: businesses, isLoading } = useAdminBusinesses();
  const createBusiness = useCreateBusiness();
  const updateBusiness = useUpdateBusiness();
  const toggleStatus = useToggleBusinessStatus();
  const deleteBusiness = useDeleteBusiness();
  const toggleFeatured = useToggleBusinessFeatured();

  const filteredBusinesses = businesses?.filter((business) => {
    const matchesSearch = business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (typeFilter === "all") return true;
    return business.type === typeFilter;
  });

  const handleCreateBusiness = () => {
    if (!newBusiness.name || !newBusiness.type) return;
    createBusiness.mutate(newBusiness, {
      onSuccess: () => {
        setDialogOpen(false);
        setNewBusiness({ 
          name: "", 
          type: "restaurant", 
          description: "", 
          category: "", 
          image: "", 
          commission_rate: 15 
        });
      },
    });
  };

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)}-${digits.slice(4, 11)}`;
  };

  // Stats
  const totalBusinesses = businesses?.length || 0;
  const restaurantCount = businesses?.filter(b => b.type === 'restaurant').length || 0;
  const groceryCount = businesses?.filter(b => b.type === 'grocery').length || 0;
  const bakeryCount = businesses?.filter(b => b.type === 'bakery').length || 0;
  const shopCount = businesses?.filter(b => b.type === 'shop').length || 0;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalBusinesses}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{restaurantCount}</p>
                <p className="text-xs text-muted-foreground">Restaurants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{groceryCount}</p>
                <p className="text-xs text-muted-foreground">Grocery</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Cake className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{bakeryCount}</p>
                <p className="text-xs text-muted-foreground">Bakeries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{shopCount}</p>
                <p className="text-xs text-muted-foreground">Shops</p>
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
              placeholder="Search businesses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v: typeof typeFilter) => setTypeFilter(v)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="restaurant">Restaurants</SelectItem>
              <SelectItem value="grocery">Grocery</SelectItem>
              <SelectItem value="bakery">Bakery</SelectItem>
              <SelectItem value="shop">Shop</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground gap-2">
              <Plus className="w-4 h-4" />
              Add Business
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Business</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="business-name">Business Name *</Label>
                <Input
                  id="business-name"
                  placeholder="Enter business name"
                  value={newBusiness.name}
                  onChange={(e) => setNewBusiness({ ...newBusiness, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-type">Business Type *</Label>
                <Select
                  value={newBusiness.type}
                  onValueChange={(value: 'restaurant' | 'grocery' | 'bakery' | 'shop') => 
                    setNewBusiness({ ...newBusiness, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="grocery">Grocery Store</SelectItem>
                    <SelectItem value="bakery">Bakery</SelectItem>
                    <SelectItem value="shop">Shop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Admin-controlled system - no business owner login */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g., Fast Food, Pakistani, Chinese"
                  value={newBusiness.category}
                  onChange={(e) => setNewBusiness({ ...newBusiness, category: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission">Commission %</Label>
                <Input
                  id="commission"
                  type="number"
                  min="0"
                  max="100"
                  value={newBusiness.commission_rate}
                  onChange={(e) => setNewBusiness({ ...newBusiness, commission_rate: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the business"
                  value={newBusiness.description}
                  onChange={(e) => setNewBusiness({ ...newBusiness, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Business Image</Label>
                <ImageUpload
                  value={newBusiness.image}
                  onChange={(url) => setNewBusiness({ ...newBusiness, image: url })}
                  bucket="business-images"
                  folder="logos"
                  label="Upload Business Logo"
                  maxSizeMB={5}
                />
              </div>
              <Button 
                onClick={handleCreateBusiness} 
                className="w-full gradient-primary text-primary-foreground"
                disabled={createBusiness.isPending || !newBusiness.name}
              >
                {createBusiness.isPending ? "Creating..." : "Create Business"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Menu Items Dialog */}
      <Dialog open={menuDialogOpen} onOpenChange={setMenuDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Menu Items - {selectedBusiness?.name}</DialogTitle>
          </DialogHeader>
          {selectedBusiness && (
            <MenuItemsManager businessId={selectedBusiness.id} />
          )}
        </DialogContent>
      </Dialog>

      {/* Businesses Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-40 bg-muted rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBusinesses?.map((business, index) => {
            const Icon = businessTypeIcons[business.type as keyof typeof businessTypeIcons] || Store;
            const colorClass = businessTypeColors[business.type as keyof typeof businessTypeColors] || "bg-muted text-foreground";
            
            return (
              <motion.div
                key={business.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden hover:shadow-card transition-all duration-300">
                  {/* Image */}
                  <div className="h-32 bg-muted relative">
                    {business.image ? (
                      <img 
                        src={business.image} 
                        alt={business.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <Icon className="w-12 h-12 text-primary/50" />
                      </div>
                    )}
                    <Badge 
                      className={`absolute top-2 right-2 ${colorClass}`}
                    >
                      {business.type}
                    </Badge>
                    {business.featured && (
                      <Badge className="absolute top-2 left-2 bg-amber-500 text-white">
                        <Award className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {business.name}
                        </h3>
                        {business.category && (
                          <p className="text-sm text-muted-foreground truncate">
                            {business.category}
                          </p>
                        )}
                      </div>
                      <Badge 
                        variant={business.is_active ? "default" : "secondary"}
                        className={business.is_active ? "bg-accent/20 text-accent" : ""}
                      >
                        {business.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium">{business.rating}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{business.eta}</span>
                      <div className="flex items-center gap-1">
                        <Percent className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{(business as any).commission_rate || 15}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedBusiness({ id: business.id, name: business.name });
                            setMenuDialogOpen(true);
                          }}
                        >
                          <Menu className="w-4 h-4 mr-1" />
                          Menu
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleFeatured.mutate({ 
                            businessId: business.id, 
                            featured: !business.featured 
                          })}
                          className={business.featured ? "text-amber-500" : "text-muted-foreground"}
                        >
                          <Award className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleStatus.mutate({ 
                            businessId: business.id, 
                            isActive: !business.is_active 
                          })}
                          className={business.is_active ? "text-destructive" : "text-accent"}
                        >
                          {business.is_active ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingBusiness({
                              ...business,
                              commission_rate: business.commission_rate || 15
                            });
                            setEditDialogOpen(true);
                          }}
                          className="text-primary"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Business</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {business.name}? This will also delete all menu items.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteBusiness.mutate(business.id)}
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
            );
          })}
        </div>
      )}

      {filteredBusinesses?.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No businesses found</h3>
          <p className="text-muted-foreground">Add your first business to get started</p>
        </div>
      )}

      {/* Edit Business Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Business</DialogTitle>
          </DialogHeader>
          {editingBusiness && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Business Name</Label>
                <Input
                  id="edit-name"
                  value={editingBusiness.name}
                  onChange={(e) => setEditingBusiness({ ...editingBusiness, name: e.target.value })}
                  placeholder="Business name"
                />
              </div>

              <div>
                <Label htmlFor="edit-type">Business Type</Label>
                <Select
                  value={editingBusiness.type}
                  onValueChange={(value) => setEditingBusiness({ ...editingBusiness, type: value })}
                >
                  <SelectTrigger id="edit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="grocery">Grocery</SelectItem>
                    <SelectItem value="bakery">Bakery</SelectItem>
                    <SelectItem value="shop">Shop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingBusiness.description || ''}
                  onChange={(e) => setEditingBusiness({ ...editingBusiness, description: e.target.value })}
                  placeholder="Brief description"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Input
                  id="edit-category"
                  value={editingBusiness.category || ''}
                  onChange={(e) => setEditingBusiness({ ...editingBusiness, category: e.target.value })}
                  placeholder="e.g., Fast Food, Italian, Organic"
                />
              </div>

              <div>
                <Label>Business Image</Label>
                <ImageUpload
                  value={editingBusiness.image}
                  onChange={(url) => setEditingBusiness({ ...editingBusiness, image: url })}
                  bucket="business-images"
                  folder="logos"
                  label="Upload Business Logo"
                  maxSizeMB={5}
                />
              </div>

              <div>
                <Label htmlFor="edit-commission">Commission Rate (%)</Label>
                <Input
                  id="edit-commission"
                  type="number"
                  value={editingBusiness.commission_rate}
                  onChange={(e) => setEditingBusiness({ ...editingBusiness, commission_rate: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="100"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    updateBusiness.mutate({
                      businessId: editingBusiness.id,
                      updates: {
                        name: editingBusiness.name,
                        type: editingBusiness.type,
                        description: editingBusiness.description,
                        category: editingBusiness.category,
                        image: editingBusiness.image,
                        commission_rate: editingBusiness.commission_rate,
                      },
                    });
                    setEditDialogOpen(false);
                    setEditingBusiness(null);
                  }}
                  disabled={!editingBusiness.name || updateBusiness.isPending}
                >
                  {updateBusiness.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
