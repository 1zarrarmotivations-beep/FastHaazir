import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Star,
  Package
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  useBusinessMenuItems,
  useCreateMenuItem,
  useDeleteMenuItem,
  useToggleMenuItemAvailability
} from "@/hooks/useAdmin";
import { ImageUpload } from "./ImageUpload";

interface MenuItemsManagerProps {
  businessId: string;
}

export function MenuItemsManager({ businessId }: MenuItemsManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: 0,
    category: "",
    image: "",
    is_popular: false,
  });

  const { data: menuItems, isLoading } = useBusinessMenuItems(businessId);
  const createItem = useCreateMenuItem();
  const deleteItem = useDeleteMenuItem();
  const toggleAvailability = useToggleMenuItemAvailability();

  const handleCreateItem = () => {
    if (!newItem.name || newItem.price <= 0) return;

    createItem.mutate({
      business_id: businessId,
      ...newItem,
    }, {
      onSuccess: () => {
        setNewItem({ name: "", description: "", price: 0, category: "", image: "", is_popular: false });
        setShowForm(false);
      },
    });
  };

  const handleImageChange = (url: string) => {
    setNewItem(prev => ({ ...prev, image: url }));
  };

  // Group items by category
  const groupedItems = menuItems?.reduce((acc, item) => {
    const category = item.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof menuItems>) || {};

  return (
    <div className="space-y-6">
      {/* Add Item Form */}
      {!showForm ? (
        <Button
          onClick={() => setShowForm(true)}
          className="gradient-primary text-primary-foreground gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Menu Item
        </Button>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-name">Name *</Label>
                <Input
                  id="item-name"
                  placeholder="Item name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-price">Price (PKR) *</Label>
                <Input
                  id="item-price"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={newItem.price || ""}
                  onChange={(e) => setNewItem({ ...newItem, price: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-category">Category</Label>
              <Input
                id="item-category"
                placeholder="e.g., Burgers, Drinks, Desserts"
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-description">Description</Label>
              <Textarea
                id="item-description"
                placeholder="Brief description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Item Image</Label>
              <ImageUpload
                value={newItem.image}
                onChange={handleImageChange}
                bucket="menu-items"
                folder="items"
                label="Upload Item Image"
                maxSizeMB={5}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-popular"
                checked={newItem.is_popular}
                onCheckedChange={(checked) => setNewItem({ ...newItem, is_popular: !!checked })}
              />
              <Label htmlFor="is-popular" className="text-sm font-normal">Mark as popular item</Label>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreateItem}
                className="gradient-primary text-primary-foreground"
                disabled={createItem.isPending || !newItem.name || newItem.price <= 0}
              >
                {createItem.isPending ? "Adding..." : "Add Item"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-20 bg-muted rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Menu Items by Category */}
      {Object.entries(groupedItems).map(([category, items]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">{category}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items?.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`overflow-hidden ${!item.is_available ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium text-foreground truncate">{item.name}</h4>
                            <p className="text-lg font-bold text-primary">Rs. {item.price}</p>
                          </div>
                          <div className="flex gap-1">
                            {item.is_popular && (
                              <Badge className="bg-amber-500/10 text-amber-600">
                                <Star className="w-3 h-3 mr-1" />
                                Popular
                              </Badge>
                            )}
                          </div>
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                      <Badge variant={item.is_available ? "default" : "secondary"}>
                        {item.is_available ? "Available" : "Unavailable"}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleAvailability.mutate({
                            itemId: item.id,
                            businessId,
                            isAvailable: !item.is_available
                          })}
                        >
                          {item.is_available ? (
                            <ToggleRight className="w-4 h-4 text-accent" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteItem.mutate({ itemId: item.id, businessId })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {/* Empty State */}
      {!isLoading && menuItems?.length === 0 && (
        <div className="text-center py-8">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No menu items</h3>
          <p className="text-muted-foreground">Add your first menu item to get started</p>
        </div>
      )}
    </div>
  );
}
