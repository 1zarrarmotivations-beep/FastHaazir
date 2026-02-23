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
