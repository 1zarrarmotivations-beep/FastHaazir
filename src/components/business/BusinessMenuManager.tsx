import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Image as ImageIcon,
  Check,
  X,
  Search,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  BusinessMenuItem,
  useBusinessMenuItems, 
  useCreateMenuItem, 
  useUpdateMenuItem, 
  useDeleteMenuItem 
} from "@/hooks/useBusinessDashboard";

interface BusinessMenuManagerProps {
  businessId: string;
  businessType: string;
}

const categoryOptions: Record<string, string[]> = {
  restaurant: ['Burgers', 'Pizza', 'Rice', 'BBQ', 'Drinks', 'Desserts', 'Deals'],
  bakery: ['Breads', 'Cakes', 'Pastries', 'Cookies', 'Donuts', 'Custom Orders'],
  grocery: ['Fruits', 'Vegetables', 'Dairy', 'Meat', 'Beverages', 'Snacks', 'Household'],
  shop: ['Electronics', 'Clothing', 'Accessories', 'Home', 'Beauty', 'Other'],
};

export const BusinessMenuManager = ({ businessId, businessType }: BusinessMenuManagerProps) => {
  const { data: menuItems, isLoading } = useBusinessMenuItems(businessId);
  const createMutation = useCreateMenuItem();
  const updateMutation = useUpdateMenuItem();
  const deleteMutation = useDeleteMenuItem();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<BusinessMenuItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const [newItem, setNewItem] = useState({
    name: '',
    price: '',
    category: '',
    description: '',
    image: '',
    is_popular: false,
    is_available: true,
  });

  const categories = categoryOptions[businessType] || categoryOptions.shop;

  const filteredItems = menuItems?.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const groupedItems = filteredItems?.reduce((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, BusinessMenuItem[]>);

  const handleAddItem = () => {
    if (!newItem.name || !newItem.price) return;
    
    createMutation.mutate({
      business_id: businessId,
      name: newItem.name,
      price: parseInt(newItem.price),
      category: newItem.category || null,
      description: newItem.description || null,
      image: newItem.image || null,
      is_popular: newItem.is_popular,
      is_available: newItem.is_available,
    }, {
      onSuccess: () => {
        setShowAddDialog(false);
        setNewItem({
          name: '',
          price: '',
          category: '',
          description: '',
          image: '',
          is_popular: false,
          is_available: true,
        });
      },
    });
  };

  const handleToggleAvailability = (item: BusinessMenuItem) => {
    updateMutation.mutate({
      itemId: item.id,
      updates: { is_available: !item.is_available },
      businessId,
    });
  };

  const handleDeleteItem = (itemId: string) => {
    deleteMutation.mutate({ itemId, businessId });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Menu Management</h2>
          <p className="text-muted-foreground">{menuItems?.length || 0} items in your menu</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground gap-2">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Menu Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Item Name *</Label>
                <Input
                  placeholder="Enter item name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Price (PKR) *</Label>
                <Input
                  type="number"
                  placeholder="Enter price"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={newItem.category}
                  onValueChange={(value) => setNewItem({ ...newItem, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="Item description"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input
                  placeholder="https://..."
                  value={newItem.image}
                  onChange={(e) => setNewItem({ ...newItem, image: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Mark as Popular</Label>
                <Switch
                  checked={newItem.is_popular}
                  onCheckedChange={(checked) => setNewItem({ ...newItem, is_popular: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Available</Label>
                <Switch
                  checked={newItem.is_available}
                  onCheckedChange={(checked) => setNewItem({ ...newItem, is_available: checked })}
                />
              </div>
              <Button 
                onClick={handleAddItem} 
                className="w-full gradient-primary text-primary-foreground"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Adding...' : 'Add Item'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Menu Items */}
      {groupedItems && Object.keys(groupedItems).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                {category}
                <Badge variant="secondary">{items.length}</Badge>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className={`overflow-hidden ${!item.is_available ? 'opacity-60' : ''}`}>
                        {item.image ? (
                          <div className="h-32 overflow-hidden">
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-32 bg-muted flex items-center justify-center">
                            <ImageIcon className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-foreground">{item.name}</h4>
                              <p className="text-primary font-bold">PKR {item.price}</p>
                            </div>
                            <div className="flex gap-1">
                              {item.is_popular && (
                                <Badge className="bg-primary/10 text-primary text-xs">Popular</Badge>
                              )}
                            </div>
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t border-border">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Available</span>
                              <Switch
                                checked={item.is_available}
                                onCheckedChange={() => handleToggleAvailability(item)}
                              />
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Item</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{item.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Menu Items</h3>
          <p className="text-muted-foreground mb-4">
            Start adding items to your menu to receive orders.
          </p>
          <Button onClick={() => setShowAddDialog(true)} className="gradient-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Item
          </Button>
        </Card>
      )}
    </div>
  );
};

// Helper component for the empty state
const UtensilsCrossed = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 12L19 5M12 12L5 19M12 12L5 5M12 12L19 19" />
  </svg>
);
