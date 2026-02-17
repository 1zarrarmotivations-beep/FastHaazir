import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Folder,
    FolderOpen,
    Plus,
    Edit,
    Trash2,
    GripVertical,
    ChevronRight,
    ChevronDown,
    Search,
    Loader2,
    Image,
    Clock,
    Settings,
    Package,
    AlertCircle,
    CheckCircle,
    XCircle,
    MoreVertical,
    ArrowUpDown,
    Layers
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { safeLower } from '@/lib/utils';
import CategoryDragDropTree from './CategoryDragDropTree';

// Types
interface Category {
    id: string;
    business_id: string;
    name: string;
    name_ur?: string;
    description?: string;
    description_ur?: string;
    parent_id?: string;
    image_url?: string;
    icon_name?: string;
    slug?: string;
    sort_order: number;
    is_active: boolean;
    is_locked: boolean;
    depth_level: number;
    path?: string;
    availability_schedule?: Record<string, { start: string; end: string }>;
    metadata?: Record<string, any>;
    created_at: string;
    updated_at?: string;
    deleted_at?: string;
    product_count?: number;
    subcategories?: Category[];
    parent?: Category;
}

interface CategoryFormData {
    name: string;
    name_ur: string;
    description: string;
    description_ur: string;
    parent_id: string;
    image_url: string;
    icon_name: string;
    sort_order: number;
    is_active: boolean;
    availability_schedule: Record<string, { start: string; end: string }>;
}

interface MenuCategoryManagerProps {
    businessId: string;
    onCategorySelect?: (categoryId: string) => void;
    selectedCategoryId?: string;
}

const ICON_OPTIONS = [
    { value: 'utensils', label: 'Utensils (Food)' },
    { value: 'coffee', label: 'Coffee (Beverages)' },
    { value: 'cake', label: 'Cake (Desserts)' },
    { value: 'salad', label: 'Salad (Appetizers)' },
    { value: 'beef', label: 'Beef (Main Course)' },
    { value: 'fish', label: 'Fish (Seafood)' },
    { value: 'pizza', label: 'Pizza' },
    { value: 'sandwich', label: 'Sandwich' },
    { value: 'ice-cream', label: 'Ice Cream' },
    { value: 'wine', label: 'Wine (Drinks)' },
    { value: 'pill', label: 'Pill (Medicine)' },
    { value: 'package', label: 'Package (General)' },
];

const DAYS_OF_WEEK = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
];

const defaultFormData: CategoryFormData = {
    name: '',
    name_ur: '',
    description: '',
    description_ur: '',
    parent_id: '',
    image_url: '',
    icon_name: '',
    sort_order: 0,
    is_active: true,
    availability_schedule: {},
};

const MenuCategoryManager: React.FC<MenuCategoryManagerProps> = ({
    businessId,
    onCategorySelect,
    selectedCategoryId,
}) => {
    // State
    const [categories, setCategories] = useState<Category[]>([]);
    const [flatCategories, setFlatCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState<CategoryFormData>(defaultFormData);
    const [saving, setSaving] = useState(false);

    // Delete state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const [forceDelete, setForceDelete] = useState(false);

    // Bulk operations
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkOperationLoading, setBulkOperationLoading] = useState(false);

    // Fetch categories
    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('business_id', businessId)
                .is('deleted_at', null)
                .order('sort_order', { ascending: true })
                .order('name', { ascending: true });

            if (error) throw error;

            // Get product counts
            const categoryIds = (data || []).map(c => c.id);
            const { data: productCounts } = await supabase
                .from('menu_items')
                .select('category_id')
                .in('category_id', categoryIds)
                .eq('is_deleted', false);

            const countMap: Record<string, number> = {};
            (productCounts || []).forEach(item => {
                countMap[item.category_id] = (countMap[item.category_id] || 0) + 1;
            });

            const categoriesWithCounts = (data || []).map(cat => ({
                ...cat,
                product_count: countMap[cat.id] || 0,
            }));

            setFlatCategories(categoriesWithCounts);

            // Build tree structure
            const tree = buildCategoryTree(categoriesWithCounts);
            setCategories(tree);
        } catch (error: any) {
            console.error('Error fetching categories:', error);
            toast.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    }, [businessId]);

    // Build tree structure from flat list
    const buildCategoryTree = (flatList: Category[]): Category[] => {
        const map = new Map<string, Category>();
        const roots: Category[] = [];

        // First pass: create map
        flatList.forEach(cat => {
            map.set(cat.id, { ...cat, subcategories: [] });
        });

        // Second pass: build tree
        flatList.forEach(cat => {
            const node = map.get(cat.id)!;
            if (cat.parent_id && map.has(cat.parent_id)) {
                const parent = map.get(cat.parent_id)!;
                parent.subcategories = parent.subcategories || [];
                parent.subcategories.push(node);
            } else {
                roots.push(node);
            }
        });

        // Sort each level
        const sortChildren = (nodes: Category[]): Category[] => {
            return nodes
                .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
                .map(node => ({
                    ...node,
                    subcategories: node.subcategories ? sortChildren(node.subcategories) : []
                }));
        };

        return sortChildren(roots);
    };

    useEffect(() => {
        if (businessId) {
            fetchCategories();
        }
    }, [businessId, fetchCategories]);

    // Toggle expand/collapse
    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Open create form
    const handleCreate = (parentId?: string) => {
        setEditingCategory(null);
        setFormData({
            ...defaultFormData,
            parent_id: parentId || '',
        });
        setIsFormOpen(true);
    };

    // Open edit form
    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            name_ur: category.name_ur || '',
            description: category.description || '',
            description_ur: category.description_ur || '',
            parent_id: category.parent_id || '',
            image_url: category.image_url || '',
            icon_name: category.icon_name || '',
            sort_order: category.sort_order,
            is_active: category.is_active,
            availability_schedule: category.availability_schedule || {},
        });
        setIsFormOpen(true);
    };

    // Save category
    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error('Category name is required');
            return;
        }

        setSaving(true);
        try {
            if (editingCategory) {
                // Update existing
                const { error } = await supabase
                    .from('categories')
                    .update({
                        name: formData.name.trim(),
                        name_ur: formData.name_ur.trim() || null,
                        description: formData.description.trim() || null,
                        description_ur: formData.description_ur.trim() || null,
                        parent_id: formData.parent_id || null,
                        image_url: formData.image_url.trim() || null,
                        icon_name: formData.icon_name || null,
                        sort_order: formData.sort_order,
                        is_active: formData.is_active,
                        availability_schedule: formData.availability_schedule,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', editingCategory.id);

                if (error) throw error;
                toast.success('Category updated successfully');
            } else {
                // Create new
                const { error } = await supabase
                    .from('categories')
                    .insert({
                        business_id: businessId,
                        name: formData.name.trim(),
                        name_ur: formData.name_ur.trim() || null,
                        description: formData.description.trim() || null,
                        description_ur: formData.description_ur.trim() || null,
                        parent_id: formData.parent_id || null,
                        image_url: formData.image_url.trim() || null,
                        icon_name: formData.icon_name || null,
                        sort_order: formData.sort_order,
                        is_active: formData.is_active,
                        availability_schedule: formData.availability_schedule,
                    });

                if (error) throw error;
                toast.success('Category created successfully');
            }

            setIsFormOpen(false);
            fetchCategories();
        } catch (error: any) {
            console.error('Error saving category:', error);
            toast.error(error.message || 'Failed to save category');
        } finally {
            setSaving(false);
        }
    };

    // Open delete dialog
    const handleDeleteClick = (category: Category) => {
        setCategoryToDelete(category);
        setForceDelete(false);
        setDeleteDialogOpen(true);
    };

    // Confirm delete
    const handleDeleteConfirm = async () => {
        if (!categoryToDelete) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('categories')
                .update({
                    deleted_at: new Date().toISOString(),
                    is_active: false,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', categoryToDelete.id);

            if (error) {
                if (error.message.includes('active products') || error.message.includes('subcategories')) {
                    toast.error('Cannot delete category with active products or subcategories');
                    return;
                }
                throw error;
            }

            toast.success('Category deleted successfully');
            setDeleteDialogOpen(false);
            setCategoryToDelete(null);
            fetchCategories();
        } catch (error: any) {
            console.error('Error deleting category:', error);
            toast.error(error.message || 'Failed to delete category');
        } finally {
            setSaving(false);
        }
    };

    // Handle drag and drop reorder
    const handleReorder = async (newOrder: Category[]) => {
        const sortOrders = newOrder.map((cat, index) => ({
            id: cat.id,
            sort_order: index,
        }));

        // Optimistic update
        setCategories(newOrder);

        try {
            // Update sort order in database
            for (const item of sortOrders) {
                await supabase
                    .from('categories')
                    .update({ sort_order: item.sort_order })
                    .eq('id', item.id);
            }
            toast.success('Categories reordered');
        } catch (error: any) {
            console.error('Error reordering:', error);
            toast.error('Failed to save order');
            fetchCategories(); // Revert on error
        }
    };

    // Bulk toggle status
    const handleBulkToggleStatus = async (isActive: boolean) => {
        if (selectedIds.size === 0) return;

        setBulkOperationLoading(true);
        try {
            const { error } = await supabase
                .from('categories')
                .update({ is_active: isActive, updated_at: new Date().toISOString() })
                .in('id', Array.from(selectedIds))
                .eq('is_locked', false);

            if (error) throw error;

            toast.success(`${selectedIds.size} categories ${isActive ? 'activated' : 'deactivated'}`);
            setSelectedIds(new Set());
            fetchCategories();
        } catch (error: any) {
            console.error('Error in bulk operation:', error);
            toast.error('Failed to update categories');
        } finally {
            setBulkOperationLoading(false);
        }
    };

    // Filter categories by search
    const filteredCategories = searchQuery
        ? flatCategories.filter(cat =>
            safeLower(cat.name).includes(safeLower(searchQuery)) ||
            (cat.name_ur && safeLower(cat.name_ur).includes(safeLower(searchQuery)))
        )
        : null;

    // Render flat list for search results
    const renderFlatItem = (category: Category) => {
        const isSelected = selectedCategoryId === category.id;

        return (
            <div
                key={category.id}
                className={`group flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border border-primary/30' : ''
                    } ${!category.is_active ? 'opacity-50' : ''}`}
                onClick={() => onCategorySelect?.(category.id)}
            >
                <Package className={`w-5 h-5 ${category.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                    <span className="font-medium truncate">{category.name}</span>
                    {category.name_ur && (
                        <span className="text-sm text-muted-foreground ml-2">({category.name_ur})</span>
                    )}
                </div>
                <Badge variant="outline" className="text-xs">
                    {category.product_count || 0} items
                </Badge>
            </div>
        );
    };

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
        <div className="space-y-4">
            {/* Header */}
            <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Layers className="w-5 h-5 text-primary" />
                            Menu Categories
                        </CardTitle>
                        <Button onClick={() => handleCreate()} size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Category
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search categories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Bulk actions */}
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                            <span className="text-sm text-muted-foreground">
                                {selectedIds.size} selected
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBulkToggleStatus(true)}
                                disabled={bulkOperationLoading}
                            >
                                Activate
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBulkToggleStatus(false)}
                                disabled={bulkOperationLoading}
                            >
                                Deactivate
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedIds(new Set())}
                            >
                                Clear
                            </Button>
                        </div>
                    )}

                    {/* Category list */}
                    {searchQuery ? (
                        <ScrollArea className="h-[400px]">
                            {/* Search results (flat list) */}
                            {filteredCategories && filteredCategories.length > 0 ? (
                                <div className="space-y-1">
                                    {filteredCategories.map(renderFlatItem)}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                    <Search className="w-8 h-8 mb-2" />
                                    <p>No categories found</p>
                                </div>
                            )}
                        </ScrollArea>
                    ) : (
                        // Drag & Drop Tree
                        <CategoryDragDropTree
                            businessId={businessId}
                            data={categories}
                            loading={loading}
                            embedded={true}
                            onReorder={handleReorder}
                            onEdit={handleEdit}
                            onDelete={handleDeleteClick}
                            onCreate={handleCreate}
                            onCategorySelect={onCategorySelect}
                            selectedCategoryId={selectedCategoryId}
                        />
                    )}

                </CardContent>
            </Card>

            {/* Category Form Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingCategory ? 'Edit Category' : 'Create Category'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingCategory
                                ? 'Update the category details below.'
                                : 'Fill in the details to create a new category.'}
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="basic">Basic Info</TabsTrigger>
                            <TabsTrigger value="language">Language</TabsTrigger>
                            <TabsTrigger value="schedule">Availability</TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" className="space-y-4 mt-4">
                            {/* Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name">Category Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Appetizers, Main Course, Desserts"
                                />
                            </div>

                            {/* Parent Category */}
                            <div className="space-y-2">
                                <Label htmlFor="parent">Parent Category (Optional)</Label>
                                <Select
                                    value={formData.parent_id}
                                    onValueChange={(value) => setFormData({ ...formData, parent_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="None (Top-level category)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">None (Top-level category)</SelectItem>
                                        {flatCategories
                                            .filter(cat => cat.id !== editingCategory?.id)
                                            .map(cat => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    {'  '.repeat(cat.depth_level || 0)}
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief description of this category"
                                    rows={3}
                                />
                            </div>

                            {/* Icon */}
                            <div className="space-y-2">
                                <Label htmlFor="icon">Icon</Label>
                                <Select
                                    value={formData.icon_name}
                                    onValueChange={(value) => setFormData({ ...formData, icon_name: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an icon" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ICON_OPTIONS.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Image URL */}
                            <div className="space-y-2">
                                <Label htmlFor="image_url">Image URL</Label>
                                <Input
                                    id="image_url"
                                    value={formData.image_url}
                                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>

                            {/* Sort Order */}
                            <div className="space-y-2">
                                <Label htmlFor="sort_order">Sort Order</Label>
                                <Input
                                    id="sort_order"
                                    type="number"
                                    value={formData.sort_order}
                                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                                    min={0}
                                />
                            </div>

                            {/* Active Status */}
                            <div className="flex items-center justify-between">
                                <Label htmlFor="is_active">Active</Label>
                                <Switch
                                    id="is_active"
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="language" className="space-y-4 mt-4">
                            {/* Urdu Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name_ur">Category Name (Urdu)</Label>
                                <Input
                                    id="name_ur"
                                    value={formData.name_ur}
                                    onChange={(e) => setFormData({ ...formData, name_ur: e.target.value })}
                                    placeholder="اردو میں نام"
                                    dir="rtl"
                                />
                            </div>

                            {/* Urdu Description */}
                            <div className="space-y-2">
                                <Label htmlFor="description_ur">Description (Urdu)</Label>
                                <Textarea
                                    id="description_ur"
                                    value={formData.description_ur}
                                    onChange={(e) => setFormData({ ...formData, description_ur: e.target.value })}
                                    placeholder="اس زمرے کی تفصیل"
                                    rows={3}
                                    dir="rtl"
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="schedule" className="space-y-4 mt-4">
                            <div className="text-sm text-muted-foreground mb-4">
                                Set availability schedule for this category. Leave empty for always available.
                            </div>

                            {DAYS_OF_WEEK.map(day => (
                                <div key={day.key} className="flex items-center gap-4 p-3 border rounded-lg">
                                    <div className="w-24 font-medium">{day.label}</div>
                                    <div className="flex items-center gap-2 flex-1">
                                        <Input
                                            type="time"
                                            value={formData.availability_schedule[day.key]?.start || ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                availability_schedule: {
                                                    ...formData.availability_schedule,
                                                    [day.key]: {
                                                        ...formData.availability_schedule[day.key],
                                                        start: e.target.value,
                                                    },
                                                },
                                            })}
                                            className="w-32"
                                            placeholder="Start"
                                        />
                                        <span className="text-muted-foreground">to</span>
                                        <Input
                                            type="time"
                                            value={formData.availability_schedule[day.key]?.end || ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                availability_schedule: {
                                                    ...formData.availability_schedule,
                                                    [day.key]: {
                                                        ...formData.availability_schedule[day.key],
                                                        end: e.target.value,
                                                    },
                                                },
                                            })}
                                            className="w-32"
                                            placeholder="End"
                                        />
                                        {formData.availability_schedule[day.key]?.start && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    const newSchedule = { ...formData.availability_schedule };
                                                    delete newSchedule[day.key];
                                                    setFormData({ ...formData, availability_schedule: newSchedule });
                                                }}
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editingCategory ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Category</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{categoryToDelete?.name}"?
                            {categoryToDelete?.product_count && categoryToDelete.product_count > 0 && (
                                <div className="mt-2 text-destructive">
                                    This category has {categoryToDelete.product_count} products. You must move or delete them first.
                                </div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={saving || (categoryToDelete?.product_count || 0) > 0}
                        >
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
};

export default MenuCategoryManager;
