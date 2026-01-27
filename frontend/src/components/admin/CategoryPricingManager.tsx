import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Tag, 
  DollarSign, 
  Route, 
  Loader2,
  UtensilsCrossed,
  ShoppingCart,
  Cake,
  Pill,
  Package,
  Truck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useCategoryPricing, useUpdateCategoryPricing, CategoryPricing } from '@/hooks/useWithdrawals';

const categoryIcons: Record<string, any> = {
  food: UtensilsCrossed,
  grocery: ShoppingCart,
  bakery: Cake,
  medical: Pill,
  parcel: Package,
  self_delivery: Truck,
};

const categoryLabels: Record<string, string> = {
  food: 'Food Delivery',
  grocery: 'Grocery',
  bakery: 'Bakery',
  medical: 'Medical / Pharmacy',
  parcel: 'Parcel Delivery',
  self_delivery: 'Self Delivery',
};

const CategoryPricingManager = () => {
  const { data: categories, isLoading } = useCategoryPricing();
  const updatePricing = useUpdateCategoryPricing();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<CategoryPricing>>({});

  const handleEdit = (category: CategoryPricing) => {
    setEditingId(category.id);
    setEditValues({
      base_fee: category.base_fee,
      per_km_rate: category.per_km_rate,
      min_payment: category.min_payment,
      is_active: category.is_active,
    });
  };

  const handleSave = () => {
    if (!editingId) return;
    updatePricing.mutate({
      id: editingId,
      ...editValues,
    }, {
      onSuccess: () => {
        setEditingId(null);
        setEditValues({});
      }
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" />
          Category Pricing
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Set different pricing for each delivery category. These rates apply to rider earnings.
        </p>
        
        <div className="space-y-3">
          {categories?.map((category, index) => {
            const Icon = categoryIcons[category.category] || Package;
            const isEditing = editingId === category.id;

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-lg p-4 border ${category.is_active ? 'bg-muted/30 border-border' : 'bg-muted/10 border-border/50 opacity-60'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${category.is_active ? 'bg-primary/20' : 'bg-muted'}`}>
                      <Icon className={`w-5 h-5 ${category.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {categoryLabels[category.category] || category.category}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {category.category}
                      </p>
                    </div>
                  </div>
                  
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Active</Label>
                      <Switch
                        checked={editValues.is_active}
                        onCheckedChange={(checked) => setEditValues(v => ({ ...v, is_active: checked }))}
                      />
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(category)}
                    >
                      Edit
                    </Button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          Base Fee
                        </Label>
                        <Input
                          type="number"
                          value={editValues.base_fee}
                          onChange={(e) => setEditValues(v => ({ ...v, base_fee: Number(e.target.value) }))}
                          min={0}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <Route className="w-3 h-3" />
                          Per KM
                        </Label>
                        <Input
                          type="number"
                          value={editValues.per_km_rate}
                          onChange={(e) => setEditValues(v => ({ ...v, per_km_rate: Number(e.target.value) }))}
                          min={0}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          Minimum
                        </Label>
                        <Input
                          type="number"
                          value={editValues.min_payment}
                          onChange={(e) => setEditValues(v => ({ ...v, min_payment: Number(e.target.value) }))}
                          min={0}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={updatePricing.isPending}
                      >
                        {updatePricing.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-background/50 rounded p-2">
                      <p className="text-xs text-muted-foreground">Base Fee</p>
                      <p className="font-semibold text-foreground">Rs {category.base_fee}</p>
                    </div>
                    <div className="bg-background/50 rounded p-2">
                      <p className="text-xs text-muted-foreground">Per KM</p>
                      <p className="font-semibold text-foreground">Rs {category.per_km_rate}</p>
                    </div>
                    <div className="bg-background/50 rounded p-2">
                      <p className="text-xs text-muted-foreground">Minimum</p>
                      <p className="font-semibold text-foreground">Rs {category.min_payment}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryPricingManager;
