import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Search,
    Settings,
    LayoutGrid,
    Package,
    Trash2,
    Edit3,
    Eye,
    EyeOff,
    AlertCircle,
    Check,
    X,
    Image as ImageIcon,
    DollarSign,
    Box,
    TrendingUp,
    Star
} from "lucide-react";
import {
    useGroceryCategories,
    useUpsertGroceryCategory,
    useGroceryProducts,
    useUpsertGroceryProduct,
    useGrocerySettings,
    useUpdateGrocerySettings
} from "@/hooks/useGroceryAdmin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function GroceryManagement() {
    const [activeTab, setActiveTab] = useState("categories");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-textPrimary">Grocery Management</h2>
                    <p className="text-textSecondary">Control categories, products, stock, and pricing logic.</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px] mb-6">
                    <TabsTrigger value="categories" className="gap-2">
                        <LayoutGrid size={16} /> Categories
                    </TabsTrigger>
                    <TabsTrigger value="products" className="gap-2">
                        <Package size={16} /> Products
                    </TabsTrigger>
                    <TabsTrigger value="inventory" className="gap-2">
                        <Box size={16} /> Inventory
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="gap-2">
                        <Settings size={16} /> Settings
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="categories">
                    <CategoriesTab />
                </TabsContent>
                <TabsContent value="products">
                    <ProductsTab />
                </TabsContent>
                <TabsContent value="inventory">
                    <InventoryTab />
                </TabsContent>
                <TabsContent value="settings">
                    <SettingsTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// --- CATEGORIES TAB ---
function CategoriesTab() {
    const { data: categories, isLoading } = useGroceryCategories();
    const upsertCategory = useUpsertGroceryCategory();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            ...(editingCategory?.id ? { id: editingCategory.id } : {}),
            name: formData.get("name"),
            icon_url: formData.get("icon_url"),
            sort_order: parseInt(formData.get("sort_order") as string || "0"),
            is_active: true
        };
        upsertCategory.mutate(data);
        setIsModalOpen(false);
        setEditingCategory(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={() => { setEditingCategory(null); setIsModalOpen(true); }} className="gap-2">
                    <Plus size={18} /> Add Category
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories?.map((category) => (
                    <Card key={category.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden border border-border">
                                    {category.icon_url ? (
                                        <img src={category.icon_url} alt={category.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon className="text-primary w-6 h-6" />
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-bold text-textPrimary">{category.name}</h4>
                                    <p className="text-xs text-textSecondary uppercase tracking-widest font-mono">Order: {category.sort_order}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => { setEditingCategory(category); setIsModalOpen(true); }}>
                                    <Edit3 size={16} />
                                </Button>
                                <Switch
                                    checked={category.is_active}
                                    onCheckedChange={(val) => upsertCategory.mutate({ ...category, is_active: val })}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Category Name</Label>
                            <Input id="name" name="name" defaultValue={editingCategory?.name} required placeholder="e.g. Fresh Vegetables" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="icon_url">Icon URL</Label>
                            <Input id="icon_url" name="icon_url" defaultValue={editingCategory?.icon_url} placeholder="https://..." />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sort_order">Sort Order</Label>
                            <Input id="sort_order" name="sort_order" type="number" defaultValue={editingCategory?.sort_order || 0} />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={upsertCategory.isPending}>
                                {upsertCategory.isPending ? "Saving..." : "Save Category"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// --- PRODUCTS TAB ---
function ProductsTab() {
    const { data: categories } = useGroceryCategories();
    const [selectedCategory, setSelectedCategory] = useState("all");
    const { data: products } = useGroceryProducts(selectedCategory);
    const upsertProduct = useUpsertGroceryProduct();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            ...(editingProduct?.id ? { id: editingProduct.id } : {}),
            name: formData.get("name"),
            category_id: formData.get("category_id"),
            description: formData.get("description"),
            image_url: formData.get("image_url"),
            pricing_type: formData.get("pricing_type"),
            base_price: parseFloat(formData.get("base_price") as string),
            discount_price: formData.get("discount_price") ? parseFloat(formData.get("discount_price") as string) : null,
            min_quantity: parseFloat(formData.get("min_quantity") as string || "0.1"),
            max_quantity: parseFloat(formData.get("max_quantity") as string || "100"),
            is_featured: formData.get("is_featured") === "on",
            is_trending: formData.get("is_trending") === "on",
            is_visible: true
        };
        upsertProduct.mutate(data);
        setIsModalOpen(false);
        setEditingProduct(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full md:w-[250px]">
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories?.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="gap-2">
                    <Plus size={18} /> Add Product
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {products?.map((product) => (
                    <Card key={product.id} className="group overflow-hidden hover:shadow-xl transition-all border-border/50">
                        <div className="aspect-square bg-muted relative overflow-hidden">
                            {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon size={40} /></div>
                            )}
                            <div className="absolute top-2 right-2 flex flex-col gap-2">
                                {product.is_featured && <Badge className="bg-amber-500 hover:bg-amber-600 border-0"><Star size={10} className="mr-1" /> Featured</Badge>}
                                {product.is_trending && <Badge className="bg-primary hover:bg-primary/90 border-0"><TrendingUp size={10} className="mr-1" /> Trending</Badge>}
                            </div>
                        </div>
                        <CardContent className="p-4">
                            <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1">{product.category?.name}</p>
                            <h4 className="font-bold text-lg text-textPrimary mb-2 line-clamp-1">{product.name}</h4>
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-sm text-textSecondary">{product.pricing_type.replace('_', ' ')}</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xl font-black text-primary">PKR {product.discount_price || product.base_price}</p>
                                        {product.discount_price && <p className="text-sm text-textSecondary line-through">PKR {product.base_price}</p>}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setEditingProduct(product); setIsModalOpen(true); }}>
                                        <Edit3 size={14} />
                                    </Button>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => upsertProduct.mutate({ ...product, is_visible: !product.is_visible })}>
                                        {product.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="grid grid-cols-2 gap-4 py-4">
                        <div className="col-span-2 space-y-2">
                            <Label>Product Name</Label>
                            <Input name="name" defaultValue={editingProduct?.name} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select name="category_id" defaultValue={editingProduct?.category_id} required>
                                <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                                <SelectContent>
                                    {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Pricing Unit</Label>
                            <Select name="pricing_type" defaultValue={editingProduct?.pricing_type || 'per_kg'} required>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="per_kg">Per KG</SelectItem>
                                    <SelectItem value="per_gram">Per Gram</SelectItem>
                                    <SelectItem value="per_piece">Per Piece</SelectItem>
                                    <SelectItem value="fixed_pack">Fixed Pack</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Base Price (PKR)</Label>
                            <Input name="base_price" type="number" defaultValue={editingProduct?.base_price} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Discount Price (Optional)</Label>
                            <Input name="discount_price" type="number" defaultValue={editingProduct?.discount_price} />
                        </div>
                        <div className="space-y-2">
                            <Label>Min Order Quantity (default 0.1 for KG)</Label>
                            <Input name="min_quantity" type="number" step="0.1" defaultValue={editingProduct?.min_quantity || 0.1} />
                        </div>
                        <div className="space-y-2">
                            <Label>Max Order Quantity</Label>
                            <Input name="max_quantity" type="number" step="0.1" defaultValue={editingProduct?.max_quantity || 100} />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label>Image URL</Label>
                            <Input name="image_url" defaultValue={editingProduct?.image_url} />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label>Description</Label>
                            <textarea name="description" className="w-full min-h-[80px] p-2 border rounded-md" defaultValue={editingProduct?.description} />
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" name="is_featured" defaultChecked={editingProduct?.is_featured} />
                            <Label>Mark as Featured</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" name="is_trending" defaultChecked={editingProduct?.is_trending} />
                            <Label>Mark as Trending</Label>
                        </div>
                        <div className="col-span-2 mt-4">
                            <Button type="submit" className="w-full" disabled={upsertProduct.isPending}>
                                {upsertProduct.isPending ? "Saving..." : "Save Product"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// --- INVENTORY TAB ---
function InventoryTab() {
    const { data: products } = useGroceryProducts();
    const upsertProduct = useUpsertGroceryProduct();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Inventory Control</CardTitle>
                <CardDescription>Manage stock levels and availability.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted">
                            <tr>
                                <th className="p-3 text-left">Product</th>
                                <th className="p-3 text-left">Category</th>
                                <th className="p-3 text-left">Current Stock</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products?.map((product) => (
                                <tr key={product.id} className="border-t hover:bg-muted/50 transition-colors">
                                    <td className="p-3 font-medium">{product.name}</td>
                                    <td className="p-3 text-textSecondary">{product.category?.name}</td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                className="w-24 h-8"
                                                defaultValue={product.stock_quantity}
                                                onBlur={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    if (val !== product.stock_quantity) {
                                                        upsertProduct.mutate({ ...product, stock_quantity: val });
                                                    }
                                                }}
                                            />
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                {product.pricing_type === 'per_kg' ? 'KG' : 'PCS'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-right">
                                        <Badge variant={product.stock_quantity > 10 ? "secondary" : "destructive"}>
                                            {product.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

// --- SETTINGS TAB ---
function SettingsTab() {
    const { data: settings } = useGrocerySettings();
    const updateSettings = useUpdateGrocerySettings();

    const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        updateSettings.mutate({
            id: settings.id,
            min_order_value: parseFloat(formData.get("min_order_value") as string),
            is_active: true
        });
    };

    return (
        <div className="max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle>Grocery System Rules</CardTitle>
                    <CardDescription>Global variables for the grocery module.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-2">
                            <Label>Minimum Order Value (PKR)</Label>
                            <div className="flex gap-4">
                                <div className="relative flex-1">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    <Input
                                        name="min_order_value"
                                        type="number"
                                        className="pl-10"
                                        defaultValue={settings?.min_order_value || 500}
                                    />
                                </div>
                                <Button type="submit" disabled={updateSettings.isPending}>
                                    {updateSettings.isPending ? "Saving..." : "Save Status"}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Orders below this value will be blocked with a popup for the customer.</p>
                        </div>

                        <Separator />

                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-4">
                            <AlertCircle className="text-primary mt-1" />
                            <div>
                                <h4 className="font-bold text-textPrimary">Module Control</h4>
                                <p className="text-sm text-textSecondary mb-4">Temporarily disable the entire grocery system for customers.</p>
                                <div className="flex items-center gap-4">
                                    <Switch checked={settings?.is_active} onCheckedChange={(val) => updateSettings.mutate({ ...settings, is_active: val })} />
                                    <span className="text-sm font-medium">{settings?.is_active ? 'System Online' : 'System Offline (Maintenance)'}</span>
                                </div>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

function Separator() {
    return <div className="h-px bg-border w-full my-6" />;
}
