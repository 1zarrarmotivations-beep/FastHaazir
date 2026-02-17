import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload,
    FileText,
    Package,
    Grid,
    List,
    Plus,
    Trash2,
    Edit,
    Eye,
    EyeOff,
    Check,
    X,
    AlertTriangle,
    Search,
    Filter,
    ChevronDown,
    ChevronUp,
    Save,
    Send,
    Download,
    UploadCloud,
    RefreshCw,
    Image as ImageIcon,
    FileSpreadsheet,
    File
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import MenuCategoryManager from '@/components/admin/MenuCategoryManager';
import CategoryProductAssociation from '@/components/admin/CategoryProductAssociation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { safeLower } from '@/lib/utils';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL !== undefined
    ? import.meta.env.VITE_BACKEND_URL
    : (import.meta.env.DEV ? 'http://localhost:5000' : '');

if (import.meta.env.DEV) {
    console.log('[MenuManager] Backend URL:', BACKEND_URL);
}

// Types
interface MenuItem {
    id?: string;
    business_id: string;
    category_id?: string;
    name: string;
    price: number;
    description?: string;
    image_url?: string;
    is_available?: boolean;
    is_deleted?: boolean;
    category_name?: string;
    category?: string;
}

interface Category {
    id: string;
    business_id: string;
    name: string;
    is_locked: boolean;
    is_active: boolean;
    sort_order: number;
    created_at?: string;
}

// Props
interface BusinessMenuManagerProps {
    businessId: string;
    businessName: string;
    onClose?: () => void;
}

// Tab types
type TabType = 'overview' | 'categories' | 'menu-items' | 'upload' | 'bulk-edit';

export function BusinessMenuManager({ businessId, businessName, onClose }: BusinessMenuManagerProps) {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [categories, setCategories] = useState<Category[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    // Dialog states
    const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
    const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);

    // Form states
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newItem, setNewItem] = useState<Partial<MenuItem>>({
        name: '',
        price: 0,
        description: '',
        category_id: '',
        is_available: true
    });
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

    // Upload states
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [scannedItems, setScannedItems] = useState<MenuItem[]>([]);
    const [editedScannedItems, setEditedScannedItems] = useState<MenuItem[]>([]);

    // Bulk edit states
    const [bulkPriceChange, setBulkPriceChange] = useState<number>(0);
    const [bulkCategory, setBulkCategory] = useState<string>('all');

    // Fetch categories
    const fetchCategories = async () => {
        try {
            // Ensure Medicine category exists
            await supabase.rpc('ensure_medicine_category', { business_id: businessId });

            const { data } = await supabase
                .from('categories')
                .select('*')
                .eq('business_id', businessId)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    // Fetch menu items
    const fetchMenuItems = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('menu_items')
                .select('*')
                .eq('business_id', businessId)
                .eq('is_deleted', false)
                .order('name', { ascending: true });

            setMenuItems(data || []);
        } catch (error) {
            console.error('Error fetching menu items:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch data on mount
    useEffect(() => {
        fetchCategories();
        fetchMenuItems();
    }, [businessId]);

    // Filter items
    const filteredItems = menuItems.filter(item => {
        const matchesSearch = safeLower(item.name).includes(safeLower(searchQuery));
        const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Get category with counts
    const categoriesWithCounts = categories.map(cat => ({
        ...cat,
        itemCount: menuItems.filter(item => item.category_id === cat.id).length
    }));

    // Create category
    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;

        try {
            await supabase.from('categories').insert({
                business_id: businessId,
                name: newCategoryName.trim(),
                is_locked: false
            });
            toast.success('Category created');
            setNewCategoryName('');
            setIsAddCategoryDialogOpen(false);
            fetchCategories();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    // Delete category
    const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
        const cat = categories.find(c => c.id === categoryId);
        if (cat?.is_locked) {
            toast.error('Cannot delete locked category');
            return;
        }

        if (confirm(`Delete category "${categoryName}"?`)) {
            try {
                await supabase
                    .from('categories')
                    .update({ is_active: false })
                    .eq('id', categoryId);
                toast.success('Category deleted');
                fetchCategories();
            } catch (error) {
                toast.error('Failed to delete category');
            }
        }
    };

    // Create menu item
    const handleCreateItem = async () => {
        if (!newItem.name || !newItem.price) return;

        try {
            await supabase.from('menu_items').insert({
                business_id: businessId,
                category_id: newItem.category_id || null,
                name: newItem.name,
                price: newItem.price,
                description: newItem.description || null,
                is_available: true
            });
            toast.success('Item created');
            setNewItem({ name: '', price: 0, description: '', category_id: '', is_available: true });
            setIsAddItemDialogOpen(false);
            fetchMenuItems();
            fetchCategories();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    // Update menu item
    const handleUpdateItem = async () => {
        if (!editingItem?.id) return;

        try {
            await supabase
                .from('menu_items')
                .update({
                    name: editingItem.name,
                    price: editingItem.price,
                    category_id: editingItem.category_id,
                    description: editingItem.description
                })
                .eq('id', editingItem.id);
            toast.success('Item updated');
            setIsEditDialogOpen(false);
            fetchMenuItems();
        } catch (error) {
            toast.error('Failed to update item');
        }
    };

    // Delete menu item
    const handleDeleteItem = async (itemId: string) => {
        if (confirm('Delete this item?')) {
            try {
                await supabase
                    .from('menu_items')
                    .update({ is_deleted: true })
                    .eq('id', itemId);
                toast.success('Item deleted');
                fetchMenuItems();
            } catch (error) {
                toast.error('Failed to delete item');
            }
        }
    };

    // Toggle availability
    const handleToggleAvailability = async (itemId: string, currentStatus: boolean) => {
        try {
            await supabase
                .from('menu_items')
                .update({ is_available: !currentStatus })
                .eq('id', itemId);
            fetchMenuItems();
        } catch (error) {
            toast.error('Failed to update availability');
        }
    };

    // Handle file upload
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const validTypes = [
            'image/png', 'image/jpeg', 'image/jpg', 'application/pdf',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv'
        ];

        if (!validTypes.includes(file.type)) {
            toast.error('Invalid file type. Please upload PNG, JPG, PDF, XLS, XLSX, or CSV.');
            return;
        }

        setUploadedFile(file);
        setLoading(true);

        try {
            const reader = new FileReader();

            // Add error handler for FileReader
            reader.onerror = () => {
                console.error('FileReader error:', reader.error);
                toast.error('Failed to read file. Please try again.');
                setLoading(false);
            };

            reader.onload = async (e) => {
                const base64 = e.target?.result?.toString().split(',')[1];
                if (!base64) {
                    toast.error('Failed to parse file. Please try again.');
                    setLoading(false);
                    return;
                }

                const isExcel = file.type.includes('excel') || file.type.includes('spreadsheet') || file.type.includes('csv');
                const endpoint = isExcel ? '/api/menu/parse-excel' : '/api/menu/scan';
                const payloadKey = isExcel ? 'file_base64' : (file.type === 'application/pdf' ? 'pdf_base64' : 'image_base64');

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

                try {
                    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            [payloadKey]: base64,
                            file_type: file.type,
                            business_id: businessId
                        }),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error || `Server responded with ${response.status}`);
                    }

                    const result = await response.json();

                    if (result.success) {
                        const itemsWithId = result.items.map((item: any) => ({ ...item, business_id: businessId }));
                        setScannedItems(itemsWithId);
                        setEditedScannedItems(itemsWithId);
                        setIsPreviewDialogOpen(true);
                        toast.success('Menu scanned successfully');
                    } else {
                        throw new Error(result.error || 'Failed to scan menu');
                    }
                } catch (error: any) {
                    if (error.name === 'AbortError') {
                        toast.error('Scanning timed out. Please try a smaller file.');
                    } else {
                        toast.error(error.message || 'Failed to scan menu');
                    }
                    console.error('Scan fetch error:', error);
                }
            };
            reader.readAsDataURL(file);
        } catch (error: any) {
            console.error('File reading error:', error);
            toast.error(error.message || 'Failed to read file');
        } finally {
            setLoading(false);
        }
    };

    // Handle update scanned item
    const handleUpdateScannedItem = (index: number, field: keyof MenuItem, value: any) => {
        const updated = [...editedScannedItems];
        updated[index] = { ...updated[index], [field]: value };
        setEditedScannedItems(updated);
    };

    // Handle delete scanned item
    const handleDeleteScannedItem = (index: number) => {
        setEditedScannedItems(editedScannedItems.filter((_, i) => i !== index));
    };

    // Handle publish
    const handlePublish = async () => {
        if (!editedScannedItems.length) return;
        setLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout for large uploads

        try {
            const response = await fetch(`${BACKEND_URL}/api/menu/draft/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: editedScannedItems,
                    business_id: businessId
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Publish failed (${response.status})`);
            }

            const result = await response.json();

            if (result.success) {
                toast.success(`Published ${result.results.created} items`);
                if (result.results.duplicates > 0) {
                    toast.info(`${result.results.duplicates} duplicates were skipped`);
                }
                setIsPreviewDialogOpen(false);
                setUploadedFile(null);
                setScannedItems([]);
                setEditedScannedItems([]);
                fetchMenuItems();
                fetchCategories();
            } else {
                throw new Error(result.error || 'Failed to publish');
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                toast.error('Publishing timed out. Please try again.');
            } else {
                toast.error(error.message || 'Failed to publish menu');
            }
            console.error('Publish error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Handle save as draft
    const handleSaveDraft = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/menu/draft/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    business_id: businessId,
                    items: editedScannedItems,
                    file_name: uploadedFile?.name,
                    file_type: uploadedFile?.type
                })
            });

            if (!response.ok) throw new Error('Failed to save draft');
            toast.success('Draft saved successfully');
            setIsPreviewDialogOpen(false);
        } catch (error: any) {
            toast.error(error.message || 'Failed to save draft');
        }
    };

    // Check duplicates
    const duplicateWarnings = editedScannedItems
        .map(item => item.name)
        .filter((name, idx, arr) => arr.indexOf(name) !== idx);

    // Bulk operations
    const handleBulkPriceUpdate = async () => {
        try {
            if (selectedItems.size > 0) {
                // Update selected items
                for (const itemId of selectedItems) {
                    const item = menuItems.find(i => i.id === itemId);
                    if (item) {
                        const newPrice = Math.round(item.price * (1 + bulkPriceChange / 100));
                        await supabase
                            .from('menu_items')
                            .update({ price: newPrice })
                            .eq('id', itemId);
                    }
                }
                toast.success(`Updated ${selectedItems.size} items`);
            } else if (bulkCategory !== 'all') {
                // Update category
                const items = menuItems.filter(i => i.category_id === bulkCategory);
                for (const item of items) {
                    const newPrice = Math.round(item.price * (1 + bulkPriceChange / 100));
                    await supabase
                        .from('menu_items')
                        .update({ price: newPrice })
                        .eq('id', item.id);
                }
                toast.success(`Updated ${items.length} items`);
            } else if (confirm('Update ALL items in the menu?')) {
                for (const item of menuItems) {
                    const newPrice = Math.round(item.price * (1 + bulkPriceChange / 100));
                    await supabase
                        .from('menu_items')
                        .update({ price: newPrice })
                        .eq('id', item.id);
                }
                toast.success(`Updated all ${menuItems.length} items`);
            }
            fetchMenuItems();
        } catch (error) {
            toast.error('Failed to update prices');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedItems.size === 0) {
            toast.error('No items selected');
            return;
        }

        if (confirm(`Delete ${selectedItems.size} items?`)) {
            try {
                for (const itemId of selectedItems) {
                    await supabase
                        .from('menu_items')
                        .update({ is_deleted: true })
                        .eq('id', itemId);
                }
                toast.success(`Deleted ${selectedItems.size} items`);
                setSelectedItems(new Set());
                fetchMenuItems();
            } catch (error) {
                toast.error('Failed to delete items');
            }
        }
    };

    const handleBulkToggleAvailability = async (makeAvailable: boolean) => {
        if (selectedItems.size === 0) {
            toast.error('No items selected');
            return;
        }

        try {
            for (const itemId of selectedItems) {
                await supabase
                    .from('menu_items')
                    .update({ is_available: makeAvailable })
                    .eq('id', itemId);
            }
            toast.success(`Updated ${selectedItems.size} items`);
            fetchMenuItems();
        } catch (error) {
            toast.error('Failed to update availability');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">{businessName}</h2>
                    <p className="text-sm text-gray-400">Menu Management</p>
                </div>
                <Button variant="outline" onClick={() => { fetchCategories(); fetchMenuItems(); }}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
                <TabsList className="grid grid-cols-5 w-full">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="categories">Categories</TabsTrigger>
                    <TabsTrigger value="menu-items">Menu Items</TabsTrigger>
                    <TabsTrigger value="upload">Upload Menu</TabsTrigger>
                    <TabsTrigger value="bulk-edit">Bulk Edit</TabsTrigger>
                </TabsList>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* OVERVIEW TAB */}
                        <TabsContent value="overview" className="mt-6 space-y-6">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-400">Total Categories</p>
                                                <p className="text-2xl font-bold">{categories.length}</p>
                                            </div>
                                            <Grid className="w-8 h-8 text-blue-500" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-400">Total Items</p>
                                                <p className="text-2xl font-bold">{menuItems.length}</p>
                                            </div>
                                            <Package className="w-8 h-8 text-green-500" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-400">Available</p>
                                                <p className="text-2xl font-bold">{menuItems.filter(i => i.is_available).length}</p>
                                            </div>
                                            <Check className="w-8 h-8 text-orange-500" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-400">Medicine Items</p>
                                                <p className="text-2xl font-bold">
                                                    {menuItems.filter(i => i.category_name === 'Medicine').length}
                                                </p>
                                            </div>
                                            <FileText className="w-8 h-8 text-purple-500" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Categories Quick View */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Categories Overview</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {categoriesWithCounts.map(cat => (
                                            <div
                                                key={cat.id}
                                                className={`p-3 rounded-lg border ${cat.is_locked
                                                    ? 'bg-purple-500/10 border-purple-500/30'
                                                    : 'bg-gray-800/50 border-gray-700'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium">{cat.name}</span>
                                                    {cat.is_locked && <Badge variant="secondary" className="text-xs">🔒</Badge>}
                                                </div>
                                                <p className="text-sm text-gray-400 mt-1">{cat.itemCount} items</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Quick Actions */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-3">
                                        <Button onClick={() => setActiveTab('upload')} className="bg-orange-500 hover:bg-orange-600">
                                            <UploadCloud className="w-4 h-4 mr-2" />
                                            Upload Menu
                                        </Button>
                                        <Button onClick={() => setActiveTab('menu-items')} variant="outline">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Item
                                        </Button>
                                        <Button onClick={() => setActiveTab('bulk-edit')} variant="outline">
                                            <Edit className="w-4 h-4 mr-2" />
                                            Bulk Edit
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* CATEGORIES TAB */}
                        <TabsContent value="categories" className="mt-6 space-y-4">
                            <MenuCategoryManager
                                businessId={businessId}
                                onCategorySelect={(id) => {
                                    setSelectedCategory(id);
                                    setActiveTab('menu-items');
                                }}
                            />
                        </TabsContent>

                        {/* MENU ITEMS TAB */}
                        <TabsContent value="menu-items" className="mt-6 space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 flex-1">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            placeholder="Search menu items..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="All Categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            {categories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-2">
                                    {selectedItems.size > 0 && (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={handleBulkDelete}
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete ({selectedItems.size})
                                        </Button>
                                    )}
                                    <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="bg-orange-500 hover:bg-orange-600">
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add Item
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Add Menu Item</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label>Item Name</Label>
                                                    <Input
                                                        value={newItem.name || ''}
                                                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                                        placeholder="e.g., Chicken Biryani"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Price (Rs.)</Label>
                                                    <Input
                                                        type="number"
                                                        value={newItem.price || ''}
                                                        onChange={(e) => setNewItem({ ...newItem, price: parseInt(e.target.value) || 0 })}
                                                        placeholder="450"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Category</Label>
                                                    <Select
                                                        value={newItem.category_id || ''}
                                                        onValueChange={(val) => setNewItem({ ...newItem, category_id: val })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select category" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {categories.map(cat => (
                                                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Description (Optional)</Label>
                                                    <Textarea
                                                        value={newItem.description || ''}
                                                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                                        placeholder="Item description..."
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>Cancel</Button>
                                                <Button
                                                    onClick={handleCreateItem}
                                                    disabled={!newItem.name || !newItem.price}
                                                >
                                                    Create Item
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>

                            {/* Items Table */}
                            <Card>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">
                                                <Checkbox
                                                    checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedItems(new Set(filteredItems.map(i => i.id)));
                                                        } else {
                                                            setSelectedItems(new Set());
                                                        }
                                                    }}
                                                />
                                            </TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredItems.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedItems.has(item.id || '')}
                                                        onCheckedChange={(checked) => {
                                                            const newSet = new Set(selectedItems);
                                                            if (checked) {
                                                                newSet.add(item.id || '');
                                                            } else {
                                                                newSet.delete(item.id || '');
                                                            }
                                                            setSelectedItems(newSet);
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{item.category_name || 'Uncategorized'}</Badge>
                                                </TableCell>
                                                <TableCell>Rs. {item.price}</TableCell>
                                                <TableCell>
                                                    <Badge variant={item.is_available ? 'default' : 'secondary'}>
                                                        {item.is_available ? 'Available' : 'Unavailable'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleToggleAvailability(item.id || '', item.is_available || false)}
                                                        >
                                                            {item.is_available ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                setEditingItem(item);
                                                                setIsEditDialogOpen(true);
                                                            }}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:text-red-600"
                                                            onClick={() => handleDeleteItem(item.id || '')}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Card>

                            {/* Edit Dialog */}
                            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Edit Menu Item</DialogTitle>
                                    </DialogHeader>

                                    <Tabs defaultValue="details">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="details">Item Details</TabsTrigger>
                                            <TabsTrigger value="categories">Categories</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="details" className="space-y-4 py-4">
                                            {editingItem && (
                                                <>
                                                    <div className="space-y-2">
                                                        <Label>Item Name</Label>
                                                        <Input
                                                            value={editingItem.name}
                                                            onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Price (Rs.)</Label>
                                                        <Input
                                                            type="number"
                                                            value={editingItem.price}
                                                            onChange={(e) => setEditingItem({ ...editingItem, price: parseInt(e.target.value) || 0 })}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Primary Category</Label>
                                                        <Select
                                                            value={editingItem.category_id || ''}
                                                            onValueChange={(val) => setEditingItem({ ...editingItem, category_id: val })}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select category" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {categories.map(cat => (
                                                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <p className="text-xs text-muted-foreground">
                                                            This is the main category where the item will appear most prominently.
                                                        </p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Description</Label>
                                                        <Textarea
                                                            value={editingItem.description || ''}
                                                            onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                                                <Button onClick={handleUpdateItem}>
                                                    Save Changes
                                                </Button>
                                            </DialogFooter>
                                        </TabsContent>

                                        <TabsContent value="categories" className="py-4">
                                            {editingItem && editingItem.id && (
                                                <CategoryProductAssociation
                                                    businessId={businessId}
                                                    productId={editingItem.id}
                                                    mode="product-to-categories"
                                                    onAssociationChange={() => {
                                                        fetchMenuItems();
                                                        fetchCategories();
                                                    }}
                                                />
                                            )}
                                        </TabsContent>
                                    </Tabs>
                                </DialogContent>
                            </Dialog>
                        </TabsContent>

                        {/* UPLOAD TAB */}
                        <TabsContent value="upload" className="mt-6 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Upload Menu</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                                            <input
                                                type="file"
                                                accept="image/png,image/jpeg,image/jpg,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                                id="menu-upload"
                                            />
                                            <label htmlFor="menu-upload" className="cursor-pointer">
                                                <UploadCloud className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                                <p className="text-lg font-medium">Click to upload menu file</p>
                                                <p className="text-sm text-gray-400 mt-2">
                                                    Supported: PNG, JPG, PDF, XLS, XLSX, CSV
                                                </p>
                                            </label>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 text-center">
                                                <ImageIcon className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                                                <p className="text-sm">PNG/JPG</p>
                                                <p className="text-xs text-gray-400">Image OCR</p>
                                            </div>
                                            <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 text-center">
                                                <File className="w-8 h-8 mx-auto text-red-500 mb-2" />
                                                <p className="text-sm">PDF</p>
                                                <p className="text-xs text-gray-400">PDF OCR</p>
                                            </div>
                                            <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 text-center">
                                                <FileSpreadsheet className="w-8 h-8 mx-auto text-green-500 mb-2" />
                                                <p className="text-sm">XLS/XLSX</p>
                                                <p className="text-xs text-gray-400">Excel Parse</p>
                                            </div>
                                            <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 text-center">
                                                <FileText className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                                                <p className="text-sm">CSV</p>
                                                <p className="text-xs text-gray-400">CSV Parse</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Preview Dialog */}
                            <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
                                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Preview Menu Items</DialogTitle>
                                        <DialogDescription>
                                            Review and edit items before publishing. {duplicateWarnings.length > 0 && (
                                                <span className="text-orange-500 flex items-center gap-1 mt-2">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    {duplicateWarnings.length} duplicate(s) detected
                                                </span>
                                            )}
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="space-y-4">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Price</TableHead>
                                                    <TableHead>Category</TableHead>
                                                    <TableHead className="w-12"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {editedScannedItems.map((item, index) => (
                                                    <TableRow key={index} className={duplicateWarnings.includes(item.name) ? 'bg-orange-500/10' : ''}>
                                                        <TableCell>
                                                            <Input
                                                                value={item.name}
                                                                onChange={(e) => handleUpdateScannedItem(index, 'name', e.target.value)}
                                                                className="w-full"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                value={item.price}
                                                                onChange={(e) => handleUpdateScannedItem(index, 'price', parseInt(e.target.value) || 0)}
                                                                className="w-24"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                value={item.category || ''}
                                                                onChange={(e) => handleUpdateScannedItem(index, 'category', e.target.value)}
                                                                className="w-32"
                                                                placeholder="Category"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-red-500"
                                                                onClick={() => handleDeleteScannedItem(index)}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>

                                        <div className="flex justify-between items-center">
                                            <p className="text-sm text-gray-400">
                                                Total: {editedScannedItems.length} items
                                            </p>
                                        </div>
                                    </div>

                                    <DialogFooter>
                                        <Button variant="outline" onClick={handleSaveDraft}>
                                            <Save className="w-4 h-4 mr-2" />
                                            Save as Draft
                                        </Button>
                                        <Button
                                            className="bg-green-500 hover:bg-green-600"
                                            onClick={handlePublish}
                                            disabled={editedScannedItems.length === 0}
                                        >
                                            <Send className="w-4 h-4 mr-2" />
                                            Publish All ({editedScannedItems.length})
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </TabsContent>

                        {/* BULK EDIT TAB */}
                        <TabsContent value="bulk-edit" className="mt-6 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Bulk Operations</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Price Update */}
                                    <div className="space-y-4">
                                        <h4 className="font-medium">Bulk Price Update</h4>
                                        <div className="flex items-center gap-4 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant={bulkPriceChange < 0 ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setBulkPriceChange(bulkPriceChange - 10)}
                                                >
                                                    -10%
                                                </Button>
                                                <Button
                                                    variant={bulkPriceChange === 0 ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setBulkPriceChange(0)}
                                                >
                                                    0%
                                                </Button>
                                                <Button
                                                    variant={bulkPriceChange > 0 ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setBulkPriceChange(bulkPriceChange + 10)}
                                                >
                                                    +10%
                                                </Button>
                                            </div>
                                            <Input
                                                type="number"
                                                value={bulkPriceChange}
                                                onChange={(e) => setBulkPriceChange(parseInt(e.target.value) || 0)}
                                                className="w-24"
                                                placeholder="%"
                                            />
                                            <span className="text-gray-400">%</span>
                                            <Select value={bulkCategory} onValueChange={setBulkCategory}>
                                                <SelectTrigger className="w-[180px]">
                                                    <SelectValue placeholder="All or Category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Items</SelectItem>
                                                    {categories.map(cat => (
                                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button onClick={handleBulkPriceUpdate}>
                                                Apply
                                            </Button>
                                        </div>
                                    </div>

                                    <hr className="border-gray-700" />

                                    {/* Availability Toggle */}
                                    <div className="space-y-4">
                                        <h4 className="font-medium">Bulk Availability</h4>
                                        <div className="flex items-center gap-4">
                                            <p className="text-sm text-gray-400">
                                                Selected: {selectedItems.size} items
                                            </p>
                                            <Button
                                                variant="outline"
                                                onClick={() => handleBulkToggleAvailability(true)}
                                                disabled={selectedItems.size === 0}
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                Enable All
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => handleBulkToggleAvailability(false)}
                                                disabled={selectedItems.size === 0}
                                            >
                                                <EyeOff className="w-4 h-4 mr-2" />
                                                Disable All
                                            </Button>
                                        </div>
                                    </div>

                                    <hr className="border-gray-700" />

                                    {/* Bulk Delete */}
                                    <div className="space-y-4">
                                        <h4 className="font-medium">Bulk Delete</h4>
                                        <div className="flex items-center gap-4">
                                            <p className="text-sm text-gray-400">
                                                Selected: {selectedItems.size} items
                                            </p>
                                            <Button
                                                variant="destructive"
                                                onClick={handleBulkDelete}
                                                disabled={selectedItems.size === 0}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Delete Selected
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </motion.div>
                </AnimatePresence>
            </Tabs>
        </div>
    );
}

export default BusinessMenuManager;
