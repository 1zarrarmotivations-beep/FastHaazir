import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// --- Categories ---
export const useGroceryCategories = () => {
    return useQuery({
        queryKey: ["grocery-categories"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("grocery_categories")
                .select("*")
                .order("sort_order", { ascending: true });
            if (error) throw error;
            return data;
        },
    });
};

export const useUpsertGroceryCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (category: any) => {
            const { data, error } = await supabase
                .from("grocery_categories")
                .upsert(category)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["grocery-categories"] });
            toast.success("Category updated");
        },
    });
};

// --- Products ---
export const useGroceryProducts = (categoryId?: string) => {
    return useQuery({
        queryKey: ["grocery-products", categoryId],
        queryFn: async () => {
            let query = supabase.from("grocery_products").select("*, category:grocery_categories(name)");
            if (categoryId && categoryId !== 'all') {
                query = query.eq("category_id", categoryId);
            }
            const { data, error } = await query.order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
    });
};

export const useUpsertGroceryProduct = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (product: any) => {
            const { data, error } = await supabase
                .from("grocery_products")
                .upsert(product)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["grocery-products"] });
            toast.success("Product updated");
        },
    });
};

// --- Settings ---
export const useGrocerySettings = () => {
    return useQuery({
        queryKey: ["grocery-settings"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("grocery_settings")
                .select("*")
                .single();
            if (error) throw error;
            return data;
        },
    });
};

export const useUpdateGrocerySettings = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (settings: any) => {
            const { data, error } = await supabase
                .from("grocery_settings")
                .update(settings)
                .eq("id", settings.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["grocery-settings"] });
            toast.success("Settings saved");
        },
    });
};

// --- Orders ---
export const useGroceryOrders = () => {
    return useQuery({
        queryKey: ["grocery-orders"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("grocery_orders")
                .select("*, rider:riders(name), items:grocery_order_items(*, product:grocery_products(name, pricing_type))")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
    });
};

export const useUpdateGroceryOrderStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
            const { error } = await supabase
                .from("grocery_orders")
                .update({ status })
                .eq("id", orderId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["grocery-orders"] });
            toast.success("Order status updated");
        },
    });
};
// --- Storage ---
export const useUploadGroceryImage = () => {
    return useMutation({
        mutationFn: async (file: File) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('grocery')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('grocery')
                .getPublicUrl(filePath);

            return publicUrl;
        }
    });
};

// --- Product Variants ---
export const useGroceryProductVariants = (productId: string) => {
    return useQuery({
        queryKey: ["grocery-variants", productId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("grocery_variants")
                .select("*")
                .eq("product_id", productId)
                .eq("is_available", true)
                .order("weight_in_grams", { ascending: true });
            if (error) throw error;
            return data;
        },
        enabled: !!productId,
    });
};

export const useUpsertGroceryVariant = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (variant: any) => {
            const { data, error } = await supabase
                .from("grocery_variants")
                .upsert(variant)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["grocery-variants", variables.product_id] });
            toast.success("Variant saved");
        },
    });
};

// --- Product Reviews & Ratings ---
export const useGroceryProductReviews = (productId: string) => {
    return useQuery({
        queryKey: ["grocery-reviews", productId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("grocery_product_reviews")
                .select("*, customer:profiles(full_name, avatar_url)")
                .eq("product_id", productId)
                .eq("is_approved", true)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!productId,
    });
};

export const useProductRatingSummary = (productId: string) => {
    return useQuery({
        queryKey: ["grocery-rating-summary", productId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("grocery_product_rating_summary")
                .select("*")
                .eq("product_id", productId)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },
        enabled: !!productId,
    });
};

export const useSubmitGroceryReview = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (review: {
            product_id: string;
            order_id?: string;
            rating: number;
            title?: string;
            review_text?: string;
        }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Must be logged in to review");

            const { data, error } = await supabase
                .from("grocery_product_reviews")
                .insert({
                    ...review,
                    customer_id: user.id,
                    is_verified_purchase: !!review.order_id,
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success("Review submitted successfully!");
        },
    });
};

// --- Flash Sales ---
export const useGroceryFlashSales = () => {
    return useQuery({
        queryKey: ["grocery-flash-sales"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("grocery_flash_sales")
                .select("*, product:grocery_products(name, image_url, base_price, discount_price)")
                .eq("is_active", true)
                .lte("start_time", new Date().toISOString())
                .gte("end_time", new Date().toISOString())
                .order("end_time", { ascending: true });
            if (error) throw error;
            return data;
        },
    });
};

export const useUpsertFlashSale = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (sale: any) => {
            const { data, error } = await supabase
                .from("grocery_flash_sales")
                .upsert(sale)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["grocery-flash-sales"] });
            toast.success("Flash sale saved");
        },
    });
};

// --- Delivery Slots ---
export const useGroceryDeliverySlots = () => {
    return useQuery({
        queryKey: ["grocery-delivery-slots"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("grocery_delivery_slots")
                .select("*")
                .eq("is_active", true)
                .order("day_of_week", { ascending: true })
                .order("start_time", { ascending: true });
            if (error) throw error;
            return data;
        },
    });
};

// --- User's Grocery Orders ---
export const useMyGroceryOrders = () => {
    return useQuery({
        queryKey: ["my-grocery-orders"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from("grocery_orders")
                .select("*, items:grocery_order_items(*, product:grocery_products(name, image_url))")
                .eq("customer_id", user.id)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
    });
};

// --- Order Timeline ---
export const useGroceryOrderTimeline = (orderId: string) => {
    return useQuery({
        queryKey: ["grocery-order-timeline", orderId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("grocery_order_timeline")
                .select("*")
                .eq("order_id", orderId)
                .order("created_at", { ascending: true });
            if (error) throw error;
            return data;
        },
        enabled: !!orderId,
    });
};

// --- Recently Viewed ---
export const useRecentlyViewedProducts = () => {
    return useQuery({
        queryKey: ["recently-viewed"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from("grocery_recently_viewed")
                .select("product:grocery_products(*, category:grocery_categories(name), rating:grocery_product_rating_summary(average_rating, total_reviews))")
                .eq("user_id", user.id)
                .order("viewed_at", { ascending: false })
                .limit(20);
            if (error) throw error;
            return data?.map(d => d.product).filter(Boolean) || [];
        },
    });
};

export const useAddRecentlyViewed = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (productId: string) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from("grocery_recently_viewed")
                .upsert({
                    user_id: user.id,
                    product_id: productId,
                    viewed_at: new Date().toISOString(),
                }, { onConflict: 'user_id,product_id' });
            if (error) console.error("Error adding recently viewed:", error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["recently-viewed"] });
        },
    });
};

// --- Analytics (Admin) ---
export const useGroceryAnalytics = (days: number = 30) => {
    return useQuery({
        queryKey: ["grocery-analytics", days],
        queryFn: async () => {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            // Get order stats
            const { data: orders, error: ordersError } = await supabase
                .from("grocery_orders")
                .select("*")
                .gte("created_at", startDate.toISOString());
            if (ordersError) throw ordersError;

            // Get product stats
            const { data: productStats, error: statsError } = await supabase
                .from("grocery_product_daily_stats")
                .select("*")
                .gte("date", startDate.toISOString().split('T')[0]);
            if (statsError) throw statsError;

            // Calculate totals
            const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
            const totalOrders = orders?.length || 0;
            const completedOrders = orders?.filter(o => o.status === 'delivered').length || 0;
            const totalViews = productStats?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0;
            const totalPurchases = productStats?.reduce((sum, p) => sum + (p.purchase_count || 0), 0) || 0;

            // Get top products
            const { data: topProducts } = await supabase
                .from("grocery_products")
                .select("*, category:grocery_categories(name), rating:grocery_product_rating_summary(*)")
                .order("created_at", { ascending: false })
                .limit(10);

            return {
                totalRevenue,
                totalOrders,
                completedOrders,
                totalViews,
                totalPurchases,
                topProducts: topProducts || [],
                recentOrders: orders?.slice(0, 10) || [],
            };
        },
    });
};
