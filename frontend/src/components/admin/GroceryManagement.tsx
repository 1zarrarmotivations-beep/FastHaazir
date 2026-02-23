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
    Star,
    Store,
    ShoppingBag,
    ShoppingCart,
    Trash,
    Truck,
    Clock,
    Tag,
    ChevronRight,
    ChevronDown,
    Zap,
    BarChart3,
    MessageSquare,
    Palette
} from "lucide-react";
import {
    useGroceryCategories,
    useUpsertGroceryCategory,
    useGroceryProducts,
    useUpsertGroceryProduct,
    useGrocerySettings,
    useUpdateGrocerySettings,
    useGroceryProductVariants,
    useUpsertGroceryVariant,
    useGroceryFlashSales,
    useUpsertFlashSale,
    useGroceryAnalytics,
    useGroceryProductReviews
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
import { useTranslation } from "react-i18next";

export default function GroceryManagement() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState("categories");
    const { data: products } = useGroceryProducts("all");
    const lowStockCount = products?.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 10).length || 0;
    const outOfStockCount = products?.filter(p => p.stock_quantity <= 0).length || 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center text-white">
                            <Store size={24} />
                        </div>
                        <h2 className="text-4xl font-black tracking-tight text-foreground">{t('admin.groceryControl')}</h2>
                    </div>
                    <p className="text-muted-foreground font-medium text-lg">{t('admin.manageYourStore')}</p>
                </div>

                {/* Quick Stats Strip */}
                <div className="flex gap-4">
                    <div className="bg-white dark:bg-muted/10 p-4 px-6 rounded-[2rem] border border-border/50 shadow-sm flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t('admin.lowStock')}</span>
                        <span className={`text-2xl font-black ${lowStockCount > 0 ? 'text-amber-500' : 'text-foreground'}`}>{lowStockCount}</span>
                    </div>
                    <div className="bg-white dark:bg-muted/10 p-4 px-6 rounded-[2rem] border border-border/50 shadow-sm flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t('admin.outOfStock')}</span>
                        <span className={`text-2xl font-black ${outOfStockCount > 0 ? 'text-red-500' : 'text-foreground'}`}>{outOfStockCount}</span>
                    </div>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="bg-muted/30 p-1.5 rounded-[2.5rem] border border-border/40 inline-flex mb-8">
                    <TabsList className="bg-transparent border-none shadow-none h-auto gap-1">
                        {[
                            { id: 'analytics', icon: BarChart3, label: 'Analytics' },
                            { id: 'categories', icon: LayoutGrid, label: t('admin.categories') },
                            { id: 'products', icon: Package, label: t('admin.products') },
                            { id: 'variants', icon: Box, label: 'Variants' },
                            { id: 'offers', icon: Tag, label: 'Offers' },
                            { id: 'reviews', icon: MessageSquare, label: 'Reviews' },
                            { id: 'inventory', icon: Box, label: t('admin.inventory') },
                            { id: 'settings', icon: Settings, label: t('admin.settings') }
                        ].map((item) => (
                            <TabsTrigger
                                key={item.id}
                                value={item.id}
                                className="rounded-[2rem] px-8 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-muted data-[state=active]:shadow-xl data-[state=active]:text-primary transition-all duration-300 font-black uppercase tracking-widest text-[10px] gap-2.5"
                            >
                                <item.icon size={16} />
                                {item.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <TabsContent value="analytics" className="mt-0 outline-none">
                            <AnalyticsTab />
                        </TabsContent>
                        <TabsContent value="categories" className="mt-0 outline-none">
                            <CategoriesTab />
                        </TabsContent>
                        <TabsContent value="products" className="mt-0 outline-none">
                            <ProductsTab />
                        </TabsContent>
                        <TabsContent value="variants" className="mt-0 outline-none">
                            <VariantsTab />
                        </TabsContent>
                        <TabsContent value="offers" className="mt-0 outline-none">
                            <OffersTab />
                        </TabsContent>
                        <TabsContent value="reviews" className="mt-0 outline-none">
                            <ReviewsTab />
                        </TabsContent>
                        <TabsContent value="inventory" className="mt-0 outline-none">
                            <InventoryTab />
                        </TabsContent>
                        <TabsContent value="settings" className="mt-0 outline-none">
                            <SettingsTab />
                        </TabsContent>
                    </motion.div>
                </AnimatePresence>
            </Tabs>
        </div>
    );
}

// --- CATEGORIES TAB ---
function CategoriesTab() {
    const { t } = useTranslation();
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
    const { t } = useTranslation();
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
    const { t } = useTranslation();
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
    const { t } = useTranslation();
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

// --- ANALYTICS TAB ---
function AnalyticsTab() {
    const { t } = useTranslation();
    const { data: analytics, isLoading } = useGroceryAnalytics(30);

    if (isLoading) {
        return <div className="text-center py-8">Loading analytics...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                <DollarSign className="text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">Revenue</p>
                                <p className="text-xl font-black">PKR {(analytics?.totalRevenue || 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                                <ShoppingBag className="text-green-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">Orders</p>
                                <p className="text-xl font-black">{analytics?.totalOrders || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <Check className="text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">Completed</p>
                                <p className="text-xl font-black">{analytics?.completedOrders || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                <Eye className="text-amber-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">Views</p>
                                <p className="text-xl font-black">{analytics?.totalViews || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Products */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="text-primary" />
                        Top Performing Products
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {analytics?.topProducts?.slice(0, 5).map((product: any, idx: number) => (
                            <div key={product.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30">
                                <span className="font-black text-muted-foreground w-6">#{idx + 1}</span>
                                <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                                    ) : <Package className="w-full h-full p-2 text-muted" />}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold">{product.name}</p>
                                    <p className="text-xs text-muted-foreground">{product.category?.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-primary">PKR {product.base_price}</p>
                                    {product.rating?.total_reviews > 0 && (
                                        <div className="flex items-center gap-1 text-amber-500">
                                            <Star size={12} className="fill-current" />
                                            <span className="text-xs">{product.rating.average_rating?.toFixed(1)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="text-primary" />
                        Recent Orders
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {analytics?.recentOrders?.slice(0, 5).map((order: any) => (
                            <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                                <div>
                                    <p className="font-bold text-sm">#{order.id.slice(0, 8).toUpperCase()}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(order.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                                    {order.status}
                                </Badge>
                                <p className="font-black text-primary">PKR {order.total_amount}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// --- VARIANTS TAB ---
function VariantsTab() {
    const { t } = useTranslation();
    const { data: products } = useGroceryProducts("all");
    const { data: categories } = useGroceryCategories();
    const upsertVariant = useUpsertGroceryVariant();

    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVariant, setEditingVariant] = useState<any>(null);
    const { data: variants } = useGroceryProductVariants(selectedProduct?.id || '');

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            ...(editingVariant?.id ? { id: editingVariant.id } : {}),
            product_id: selectedProduct.id,
            variant_name: formData.get("variant_name"),
            weight_in_grams: parseFloat(formData.get("weight_in_grams") as string) || 0,
            price: parseFloat(formData.get("price") as string) || 0,
            discount_price: formData.get("discount_price") ? parseFloat(formData.get("discount_price") as string) : null,
            stock_quantity: parseFloat(formData.get("stock_quantity") as string) || 0,
            is_available: true
        };
        upsertVariant.mutate(data);
        setIsModalOpen(false);
        setEditingVariant(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Manage Product Variants</h3>
                <Select onValueChange={(val) => { setSelectedProduct(products?.find(p => p.id === val)); setIsModalOpen(true); }}>
                    <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Select product to add variant" />
                    </SelectTrigger>
                    <SelectContent>
                        {products?.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products?.filter(p => p.id === selectedProduct?.id).map(product => (
                    <Card key={product.id}>
                        <CardHeader>
                            <CardTitle className="text-sm">{product.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {variants?.length ? (
                                <div className="space-y-2">
                                    {variants.map((v: any) => (
                                        <div key={v.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                                            <div>
                                                <p className="font-bold text-sm">{v.variant_name}</p>
                                                <p className="text-xs text-muted-foreground">{v.weight_in_grams}g • Stock: {v.stock_quantity}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-primary">PKR {v.discount_price || v.price}</p>
                                                {v.discount_price && <p className="text-xs line-through text-muted">PKR {v.price}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No variants yet</p>
                            )}
                            <Button
                                variant="outline"
                                className="w-full mt-4"
                                onClick={() => { setEditingVariant(null); setIsModalOpen(true); }}
                            >
                                <Plus size={16} className="mr-2" /> Add Variant
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingVariant ? "Edit Variant" : "Add Variant"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Variant Name</Label>
                                <Input name="variant_name" placeholder="e.g., 500g, 1kg" defaultValue={editingVariant?.variant_name} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Weight (grams)</Label>
                                <Input name="weight_in_grams" type="number" placeholder="500" defaultValue={editingVariant?.weight_in_grams} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Price (PKR)</Label>
                                <Input name="price" type="number" placeholder="250" defaultValue={editingVariant?.price} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Discount Price (PKR)</Label>
                                <Input name="discount_price" type="number" placeholder="199" defaultValue={editingVariant?.discount_price} />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Stock Quantity</Label>
                                <Input name="stock_quantity" type="number" placeholder="100" defaultValue={editingVariant?.stock_quantity || 50} required />
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={upsertVariant.isPending}>
                            {upsertVariant.isPending ? "Saving..." : "Save Variant"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// --- OFFERS TAB ---
function OffersTab() {
    const { t } = useTranslation();
    const { data: flashSales, isLoading } = useGroceryFlashSales();
    const { data: products } = useGroceryProducts("all");
    const { data: categories } = useGroceryCategories();
    const upsertSale = useUpsertFlashSale();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<any>(null);

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            ...(editingSale?.id ? { id: editingSale.id } : {}),
            title: formData.get("title"),
            description: formData.get("description"),
            discount_percentage: formData.get("discount_percentage") ? parseFloat(formData.get("discount_percentage") as string) : null,
            product_id: formData.get("product_id") || null,
            start_time: new Date(formData.get("start_time") as string).toISOString(),
            end_time: new Date(formData.get("end_time") as string).toISOString(),
            is_active: true
        };
        upsertSale.mutate(data);
        setIsModalOpen(false);
        setEditingSale(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={() => { setEditingSale(null); setIsModalOpen(true); }} className="gap-2">
                    <Zap size={18} /> Create Flash Sale
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {flashSales?.map((sale: any) => (
                    <Card key={sale.id} className={sale.end_time < new Date().toISOString() ? 'opacity-60' : ''}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <Badge variant={sale.is_active ? "default" : "secondary"}>
                                    {sale.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                                {sale.discount_percentage && (
                                    <Badge variant="destructive">
                                        {sale.discount_percentage}% OFF
                                    </Badge>
                                )}
                            </div>
                            <CardTitle className="text-lg">{sale.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">{sale.description}</p>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Starts:</span>
                                    <span>{new Date(sale.start_time).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Ends:</span>
                                    <span>{new Date(sale.end_time).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingSale ? "Edit Flash Sale" : "Create Flash Sale"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input name="title" placeholder="Summer Sale" defaultValue={editingSale?.title} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input name="description" placeholder="Limited time offer" defaultValue={editingSale?.description} />
                        </div>
                        <div className="space-y-2">
                            <Label>Discount Percentage</Label>
                            <Input name="discount_percentage" type="number" placeholder="20" defaultValue={editingSale?.discount_percentage} />
                        </div>
                        <div className="space-y-2">
                            <Label>Product (optional)</Label>
                            <Select name="product_id" defaultValue={editingSale?.product_id || ''}>
                                <SelectTrigger><SelectValue placeholder="All products" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All Products</SelectItem>
                                    {products?.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Time</Label>
                                <Input name="start_time" type="datetime-local" defaultValue={editingSale?.start_time?.slice(0, 16)} required />
                            </div>
                            <div className="space-y-2">
                                <Label>End Time</Label>
                                <Input name="end_time" type="datetime-local" defaultValue={editingSale?.end_time?.slice(0, 16)} required />
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={upsertSale.isPending}>
                            {upsertSale.isPending ? "Saving..." : "Save Flash Sale"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// --- REVIEWS TAB ---
function ReviewsTab() {
    const { t } = useTranslation();
    const { data: products } = useGroceryProducts("all");
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const { data: reviews } = useGroceryProductReviews(selectedProduct?.id || '');

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Customer Reviews</h3>
                <Select onValueChange={(val) => setSelectedProduct(products?.find(p => p.id === val))}>
                    <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                        {products?.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedProduct && (
                <div className="space-y-4">
                    {reviews?.length ? (
                        reviews.map((review: any) => (
                            <Card key={review.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                            <span className="font-black text-primary">
                                                {review.customer?.full_name?.[0] || 'U'}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-bold">{review.customer?.full_name || 'User'}</p>
                                                <div className="flex">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} size={14} className={i < review.rating ? "text-amber-500 fill-amber-500" : "text-muted"} />
                                                    ))}
                                                </div>
                                                {review.is_verified_purchase && (
                                                    <Badge variant="secondary" className="text-[10px]">Verified</Badge>
                                                )}
                                            </div>
                                            {review.title && <p className="font-medium text-sm mb-1">{review.title}</p>}
                                            <p className="text-sm text-muted-foreground">{review.review_text}</p>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {new Date(review.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            No reviews for this product yet
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
