import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Package,
    Search,
    Loader2,
    Folder,
    CheckCircle,
    XCircle,
    Star,
    Link2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Types
interface Category {
    id: string;
    name: string;
    name_ur?: string;
    parent_id?: string;
    is_active: boolean;
}

interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    is_available: boolean;
    category_id?: string;
    category_name?: string;
}

interface CategoryProductAssociationProps {
    businessId: string;
    productId?: string;
    categoryId?: string;
    mode: 'product-to-categories' | 'category-to-products';
    onAssociationChange?: () => void;
}

const CategoryProductAssociation: React.FC<CategoryProductAssociationProps> = ({
    businessId,
    productId,
    categoryId,
    mode,
    onAssociationChange,
}) => {
    // State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // For product-to-categories mode
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<Map<string, { isPrimary: boolean; customPrice?: number }>>(new Map());

    // For category-to-products mode
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

    // Fetch data based on mode
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (mode === 'product-to-categories' && productId) {
                // Fetch all categories for the business
                const { data: cats, error: catsError } = await supabase
                    .from('categories')
                    .select('id, name, name_ur, parent_id, is_active')
                    .eq('business_id', businessId)
                    .is('deleted_at', null)
                    .eq('is_active', true)
                    .order('name');

                if (catsError) throw catsError;
                setCategories((cats as Category[]) || []);

                // Fetch existing associations for this product
                const { data: associations } = await supabase
                    .from('product_categories')
                    .select('*')
                    .eq('product_id', productId);

                // Also check the primary category from menu_items
                const { data: product } = await supabase
                    .from('menu_items')
                    .select('category_id')
                    .eq('id', productId)
                    .single();

                // Initialize selected categories
                const selected = new Map<string, { isPrimary: boolean; customPrice?: number }>();

                // Add primary category from menu_items
                if (product?.category_id) {
                    selected.set(product.category_id, { isPrimary: true });
                }

                // Add associations from product_categories
                (associations || []).forEach((assoc: any) => {
                    selected.set(assoc.category_id, {
                        isPrimary: assoc.is_primary || product?.category_id === assoc.category_id,
                        customPrice: assoc.category_specific_price,
                    });
                });

                setSelectedCategories(selected);
            } else if (mode === 'category-to-products' && categoryId) {
                // Fetch all products for the business
                const { data: prods, error: prodsError } = await supabase
                    .from('menu_items')
                    .select('id, name, description, price, image_url, is_available, category_id')
                    .eq('business_id', businessId)
                    .eq('is_deleted', false)
                    .order('name');

                if (prodsError) throw prodsError;

                // Get category names
                const categoryIds = [...new Set((prods || []).map((p: any) => p.category_id).filter(Boolean))];
                const { data: cats } = await supabase
                    .from('categories')
                    .select('id, name')
                    .in('id', categoryIds);

                const catMap = new Map((cats || []).map((c: any) => [c.id, c.name]));

                const productsWithCategory: Product[] = (prods || []).map((p: any) => ({
                    ...p,
                    category_name: p.category_id ? catMap.get(p.category_id) : undefined,
                }));

                setProducts(productsWithCategory);

                // Fetch existing associations
                const { data: associations } = await supabase
                    .from('product_categories')
                    .select('product_id')
                    .eq('category_id', categoryId);

                // Also get products where this category is the primary
                const { data: primaryProducts } = await supabase
                    .from('menu_items')
                    .select('id')
                    .eq('category_id', categoryId);

                const selected = new Set<string>();
                (associations || []).forEach((a: any) => selected.add(a.product_id));
                (primaryProducts || []).forEach((p: any) => selected.add(p.id));

                setSelectedProducts(selected);
            }
        } catch (error: any) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [businessId, productId, categoryId, mode]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Toggle category selection (for product-to-categories mode)
    const toggleCategory = (catId: string) => {
        setSelectedCategories(prev => {
            const next = new Map(prev);
            if (next.has(catId)) {
                next.delete(catId);
            } else {
                next.set(catId, { isPrimary: next.size === 0 }); // First one is primary by default
            }
            return next;
        });
    };

    // Set primary category
    const setPrimaryCategory = (catId: string) => {
        setSelectedCategories(prev => {
            const next = new Map();
            prev.forEach((value, key) => {
                next.set(key, { ...value, isPrimary: key === catId });
            });
            return next;
        });
    };

    // Toggle product selection (for category-to-products mode)
    const toggleProduct = (prodId: string) => {
        setSelectedProducts(prev => {
            const next = new Set(prev);
            if (next.has(prodId)) {
                next.delete(prodId);
            } else {
                next.add(prodId);
            }
            return next;
        });
    };

    // Save associations
    const handleSave = async () => {
        setSaving(true);
        try {
            if (mode === 'product-to-categories' && productId) {
                // Update primary category in menu_items
                const primaryCatId = Array.from(selectedCategories.entries()).find(([, v]) => v.isPrimary)?.[0];

                if (primaryCatId) {
                    const { error: updateError } = await supabase
                        .from('menu_items')
                        .update({ category_id: primaryCatId })
                        .eq('id', productId);

                    if (updateError) throw updateError;
                }

                // Delete existing associations
                await supabase
                    .from('product_categories')
                    .delete()
                    .eq('product_id', productId);

                // Insert new associations
                const associations = Array.from(selectedCategories.entries())
                    .filter(([catId]) => catId !== primaryCatId) // Don't duplicate primary
                    .map(([catId, value]) => ({
                        product_id: productId,
                        category_id: catId,
                        is_primary: value.isPrimary,
                        category_specific_price: value.customPrice,
                    }));

                if (associations.length > 0) {
                    const { error: insertError } = await supabase
                        .from('product_categories')
                        .insert(associations);

                    if (insertError) throw insertError;
                }

                toast.success('Category associations updated');
            } else if (mode === 'category-to-products' && categoryId) {
                // Get current associations
                const { data: currentAssocs } = await supabase
                    .from('product_categories')
                    .select('product_id')
                    .eq('category_id', categoryId);

                const currentProductIds = new Set((currentAssocs || []).map((a: any) => a.product_id));

                // Find products to add
                const toAdd = Array.from(selectedProducts).filter(id => !currentProductIds.has(id));

                // Find products to remove
                const toRemove = Array.from(currentProductIds).filter(id => !selectedProducts.has(id));

                // Add new associations
                if (toAdd.length > 0) {
                    const { error: addError } = await supabase
                        .from('product_categories')
                        .insert(toAdd.map(prodId => ({
                            product_id: prodId,
                            category_id: categoryId,
                            is_primary: false,
                        })));

                    if (addError) throw addError;
                }

                // Remove old associations
                if (toRemove.length > 0) {
                    const { error: removeError } = await supabase
                        .from('product_categories')
                        .delete()
                        .eq('category_id', categoryId)
                        .in('product_id', toRemove);

                    if (removeError) throw removeError;
                }

                toast.success('Product associations updated');
            }

            onAssociationChange?.();
        } catch (error: any) {
            console.error('Error saving associations:', error);
            toast.error('Failed to save associations');
        } finally {
            setSaving(false);
        }
    };

    // Filter by search
    const filteredCategories = searchQuery
        ? categories.filter(cat =>
            cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (cat.name_ur && cat.name_ur.includes(searchQuery))
        )
        : categories;

    const filteredProducts = searchQuery
        ? products.filter(prod =>
            prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (prod.description && prod.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        : products;

    if (loading) {
        return (
            <Card className="bg-card border-border">
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-card border-border">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-primary" />
                        {mode === 'product-to-categories' ? 'Assign Categories' : 'Assign Products'}
                    </CardTitle>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={mode === 'product-to-categories' ? 'Search categories...' : 'Search products...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Selection summary */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">
                        {mode === 'product-to-categories'
                            ? `${selectedCategories.size} categories selected`
                            : `${selectedProducts.size} products selected`}
                    </Badge>
                </div>

                <Separator />

                {/* List */}
                <ScrollArea className="h-[400px]">
                    {mode === 'product-to-categories' ? (
                        // Category list
                        <div className="space-y-2">
                            {filteredCategories.length > 0 ? (
                                filteredCategories.map(category => {
                                    const isSelected = selectedCategories.has(category.id);
                                    const isPrimary = selectedCategories.get(category.id)?.isPrimary;

                                    return (
                                        <motion.div
                                            key={category.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isSelected ? 'bg-primary/10 border-primary/30' : 'hover:bg-accent/50'
                                                }`}
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleCategory(category.id)}
                                            />

                                            <Folder className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium truncate">{category.name}</span>
                                                    {category.name_ur && (
                                                        <span className="text-sm text-muted-foreground">({category.name_ur})</span>
                                                    )}
                                                </div>
                                            </div>

                                            {isSelected && (
                                                <div className="flex items-center gap-2">
                                                    {isPrimary ? (
                                                        <Badge className="bg-primary text-primary-foreground">
                                                            <Star className="w-3 h-3 mr-1" />
                                                            Primary
                                                        </Badge>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setPrimaryCategory(category.id)}
                                                        >
                                                            Set as Primary
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                    <Folder className="w-8 h-8 mb-2" />
                                    <p>No categories found</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Product list
                        <div className="space-y-2">
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map(product => {
                                    const isSelected = selectedProducts.has(product.id);

                                    return (
                                        <motion.div
                                            key={product.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isSelected ? 'bg-primary/10 border-primary/30' : 'hover:bg-accent/50'
                                                }`}
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleProduct(product.id)}
                                            />

                                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                                                {product.image_url ? (
                                                    <img
                                                        src={product.image_url}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <Package className="w-5 h-5 text-muted-foreground" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium truncate">{product.name}</span>
                                                    {product.is_available ? (
                                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                                    ) : (
                                                        <XCircle className="w-4 h-4 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <span>Rs. {product.price}</span>
                                                    {product.category_name && (
                                                        <React.Fragment>
                                                            <span> - </span>
                                                            <span>{product.category_name}</span>
                                                        </React.Fragment>
                                                    )}
                                                </div>
                                            </div>

                                            {isSelected && (
                                                <Badge variant="secondary">
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    Selected
                                                </Badge>
                                            )}
                                        </motion.div>
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                    <Package className="w-8 h-8 mb-2" />
                                    <p>No products found</p>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export default CategoryProductAssociation;