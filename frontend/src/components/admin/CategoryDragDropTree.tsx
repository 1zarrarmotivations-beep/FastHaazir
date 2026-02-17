import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Folder,
    FolderOpen,
    GripVertical,
    ChevronRight,
    ChevronDown,
    Loader2,
    Package,
    Plus,
    Edit,
    Trash2,
    MoreVertical,
    ArrowUpDown,
    Layers,
    CheckCircle,
    XCircle
} from 'lucide-react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Types
interface Category {
    id: string;
    business_id: string;
    name: string;
    name_ur?: string;
    parent_id?: string;
    sort_order: number;
    is_active: boolean;
    is_locked: boolean;
    depth_level: number;
    product_count?: number;
    subcategories?: Category[];
}

interface CategoryDragDropTreeProps {
    businessId: string;
    data?: Category[];
    loading?: boolean;
    embedded?: boolean;
    onReorder?: (items: Category[], parentId?: string) => void;
    onEdit?: (category: Category) => void;
    onDelete?: (category: Category) => void;
    onCreate?: (parentId?: string) => void;
    selectedCategoryId?: string;
    onCategorySelect?: (categoryId: string) => void;
}

interface DraggableCategoryItemProps {
    category: Category;
    depth: number;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onCreateSub: () => void;
    isSelected: boolean;
    onSelect: () => void;
    onReorder: (newOrder: Category[], parentId?: string) => void;
    siblings: Category[];
}

const DraggableCategoryItem: React.FC<DraggableCategoryItemProps> = ({
    category,
    depth,
    isExpanded,
    onToggleExpand,
    onEdit,
    onDelete,
    onCreateSub,
    isSelected,
    onSelect,
    onReorder,
    siblings,
}) => {
    const dragControls = useDragControls();
    const [isDragging, setIsDragging] = useState(false);
    const hasSubcategories = category.subcategories && category.subcategories.length > 0;

    return (
        <Reorder.Item
            value={category}
            key={category.id}
            dragListener={false}
            dragControls={dragControls}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            className={`list-none ${isDragging ? 'z-50' : ''}`}
        >
            <div
                className={`group flex items-center gap-2 p-2 rounded-lg transition-all ${isDragging
                    ? 'bg-primary/20 shadow-lg border-2 border-primary'
                    : 'hover:bg-accent/50'
                    } ${isSelected ? 'bg-primary/10 border border-primary/30' : ''} ${!category.is_active ? 'opacity-50' : ''
                    }`}
                style={{ paddingLeft: `${depth * 20 + 8}px` }}
                onClick={onSelect}
            >
                {/* Drag Handle */}
                <div
                    onPointerDown={(e) => {
                        e.preventDefault();
                        dragControls.start(e);
                    }}
                    className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                </div>

                {/* Expand/Collapse button */}
                {hasSubcategories ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand();
                        }}
                        className="p-1 hover:bg-accent rounded"
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                    </button>
                ) : (
                    <div className="w-6" />
                )}

                {/* Icon */}
                <div className={`flex-shrink-0 ${category.is_active ? 'text-primary' : 'text-muted-foreground'}`}>
                    {hasSubcategories ? (
                        isExpanded ? (
                            <FolderOpen className="w-5 h-5" />
                        ) : (
                            <Folder className="w-5 h-5" />
                        )
                    ) : (
                        <Package className="w-5 h-5" />
                    )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{category.name}</span>
                        {category.name_ur && (
                            <span className="text-sm text-muted-foreground truncate">({category.name_ur})</span>
                        )}
                        {category.is_locked && (
                            <Badge variant="secondary" className="text-xs">Locked</Badge>
                        )}
                        {!category.is_active && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
                        )}
                    </div>
                </div>

                {/* Product count */}
                <Badge variant="outline" className="text-xs">
                    {category.product_count || 0} items
                </Badge>

                {/* Status indicator */}
                {category.is_active ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                            e.stopPropagation();
                            onCreateSub();
                        }}
                        title="Add subcategory"
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                        }}
                        disabled={category.is_locked}
                        title="Edit category"
                    >
                        <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        disabled={category.is_locked}
                        title="Delete category"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Subcategories */}
            <AnimatePresence>
                {hasSubcategories && isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <Reorder.Group
                            axis="y"
                            values={category.subcategories || []}
                            onReorder={(newOrder) => {
                                // Update subcategories order
                                onReorder(newOrder, category.id);
                            }}
                            className="list-none p-0 m-0"
                        >
                            {(category.subcategories || []).map((subcat) => (
                                <DraggableCategoryItem
                                    key={subcat.id}
                                    category={subcat}
                                    depth={depth + 1}
                                    isExpanded={false}
                                    onToggleExpand={() => { }}
                                    onEdit={() => onEdit()}
                                    onDelete={() => onDelete()}
                                    onCreateSub={() => onCreateSub()}
                                    isSelected={false}
                                    onSelect={() => { }}
                                    onReorder={onReorder}
                                    siblings={category.subcategories || []}
                                />
                            ))}
                        </Reorder.Group>
                    </motion.div>
                )}
            </AnimatePresence>
        </Reorder.Item>
    );
};

const CategoryDragDropTree: React.FC<CategoryDragDropTreeProps> = ({
    businessId,
    data,
    loading: externalLoading,
    embedded = false,
    onReorder,
    onEdit,
    onDelete,
    onCreate,
    selectedCategoryId,
    onCategorySelect,
}) => {
    const [internalCategories, setInternalCategories] = useState<Category[]>([]);
    const [internalLoading, setInternalLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [savingOrder, setSavingOrder] = useState(false);

    // Use external data if provided, otherwise use internal state
    const categories = data || internalCategories;
    const loading = externalLoading !== undefined ? externalLoading : internalLoading;

    // Fetch categories only if no external data provided
    const fetchCategories = useCallback(async () => {
        if (data) return;

        setInternalLoading(true);
        try {
            const { data: dbCategories, error } = await supabase
                .from('categories')
                .select('*')
                .eq('business_id', businessId)
                .is('deleted_at', null)
                .is('parent_id', null) // Only root categories
                .order('sort_order', { ascending: true })
                .order('name', { ascending: true });

            if (error) throw error;

            // Fetch subcategories for each root
            const categoryIds = (dbCategories || []).map(c => c.id);
            const { data: subcategories } = await supabase
                .from('categories')
                .select('*')
                .eq('business_id', businessId)
                .is('deleted_at', null)
                .in('parent_id', categoryIds)
                .order('sort_order', { ascending: true });

            // Get product counts
            const allIds = [...categoryIds, ...(subcategories || []).map(s => s.id)];
            const { data: productCounts } = await supabase
                .from('menu_items')
                .select('category_id')
                .in('category_id', allIds)
                .eq('is_deleted', false);

            const countMap: Record<string, number> = {};
            (productCounts || []).forEach(item => {
                countMap[item.category_id] = (countMap[item.category_id] || 0) + 1;
            });

            // Build tree
            const subcatMap = new Map<string, Category[]>();
            (subcategories || []).forEach(sub => {
                const parentId = sub.parent_id;
                if (!subcatMap.has(parentId)) {
                    subcatMap.set(parentId, []);
                }
                subcatMap.get(parentId)!.push({
                    ...sub,
                    product_count: countMap[sub.id] || 0,
                });
            });

            const tree: Category[] = (dbCategories || []).map(cat => ({
                ...cat,
                product_count: countMap[cat.id] || 0,
                subcategories: (subcatMap.get(cat.id) || []).sort((a, b) => a.sort_order - b.sort_order),
            }));

            setInternalCategories(tree);
        } catch (error: any) {
            console.error('Error fetching categories:', error);
            if (!data) toast.error('Failed to load categories');
        } finally {
            setInternalLoading(false);
        }
    }, [businessId, data]);

    useEffect(() => {
        if (!data) {
            fetchCategories();
        }
    }, [businessId, fetchCategories, data]);

    // Handle reorder
    const handleReorder = async (newOrder: Category[], parentId?: string) => {
        // If external reorder handler provided, use it
        if (onReorder) {
            onReorder(newOrder, parentId);
            return;
        }

        // Recursive update for internal state
        const updateTree = (cats: Category[]): Category[] => {
            if (!parentId) return newOrder; // It's root

            return cats.map(cat => {
                if (cat.id === parentId) {
                    return { ...cat, subcategories: newOrder };
                }
                if (cat.subcategories) {
                    return { ...cat, subcategories: updateTree(cat.subcategories) };
                }
                return cat;
            });
        };

        const nextCategories = !parentId ? newOrder : updateTree(internalCategories);
        setInternalCategories(nextCategories);

        setSavingOrder(true);

        try {
            // Update sort order for each category in the modified list
            const updates = newOrder.map((cat, index) => ({
                id: cat.id,
                sort_order: index,
            }));

            for (const update of updates) {
                await supabase
                    .from('categories')
                    .update({ sort_order: update.sort_order })
                    .eq('id', update.id);
            }

            toast.success('Categories reordered');
        } catch (error: any) {
            console.error('Error reordering:', error);
            toast.error('Failed to save order');
            if (!data) fetchCategories(); // Revert
        } finally {
            setSavingOrder(false);
        }
    };

    // Toggle expand
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

    // Expand all
    const expandAll = () => {
        const allIds = new Set<string>();
        const collectIds = (cats: Category[]) => {
            cats.forEach(cat => {
                if (cat.subcategories && cat.subcategories.length > 0) {
                    allIds.add(cat.id);
                    collectIds(cat.subcategories);
                }
            });
        };
        collectIds(categories);
        setExpandedIds(allIds);
    };

    // Collapse all
    const collapseAll = () => {
        setExpandedIds(new Set());
    };

    const Content = (
        <>
            {categories.length > 0 ? (
                <ScrollArea className={embedded ? "h-[400px] pr-4" : "h-[400px]"}>
                    <Reorder.Group
                        axis="y"
                        values={categories}
                        onReorder={handleReorder}
                        className="list-none p-0 m-0 space-y-1"
                    >
                        {categories.map((category) => (
                            <DraggableCategoryItem
                                key={category.id}
                                category={category}
                                depth={0}
                                isExpanded={expandedIds.has(category.id)}
                                onToggleExpand={() => toggleExpand(category.id)}
                                onEdit={() => onEdit?.(category)}
                                onDelete={() => onDelete?.(category)}
                                onCreateSub={() => onCreate?.(category.id)}
                                isSelected={selectedCategoryId === category.id}
                                onSelect={() => onCategorySelect?.(category.id)}
                                onReorder={handleReorder}
                                siblings={categories}
                            />
                        ))}
                    </Reorder.Group>
                </ScrollArea>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Folder className="w-12 h-12 mb-4" />
                    <p className="text-lg font-medium">No categories yet</p>
                    <p className="text-sm mb-4">Create your first category to get started</p>
                    <Button onClick={() => onCreate?.()}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Category
                    </Button>
                </div>
            )}
        </>
    );

    if (loading) {
        return embedded ? (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        ) : (
            <Card className="bg-card border-border">
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    if (embedded) {
        return <div className="space-y-2">{Content}</div>;
    }

    return (
        <Card className="bg-card border-border">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-primary" />
                        Category Tree
                        {savingOrder && (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={expandAll}>
                            Expand All
                        </Button>
                        <Button variant="outline" size="sm" onClick={collapseAll}>
                            Collapse All
                        </Button>
                        <Button size="sm" onClick={() => onCreate?.()}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Category
                        </Button>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">
                    Drag and drop to reorder categories. Changes are saved automatically.
                </p>
            </CardHeader>
            <CardContent>
                {Content}
            </CardContent>
        </Card>
    );
};

export default CategoryDragDropTree;