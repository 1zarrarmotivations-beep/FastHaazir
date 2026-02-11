
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log("Starting seed...")

        // 1. Clear existing data
        console.log("Clearing data...")
        try { await supabaseClient.from('menu_items').delete().neq('id', '00000000-0000-0000-0000-000000000000') } catch (e) { }
        try { await supabaseClient.from('businesses').delete().neq('id', '00000000-0000-0000-0000-000000000000') } catch (e) { }
        try { await supabaseClient.from('promo_banners').delete().neq('id', '00000000-0000-0000-0000-000000000000') } catch (e) { }

        // 2. Insert Businesses
        console.log("Inserting businesses...")
        const businesses = [
            {
                id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                name: 'Pizza Palace',
                type: 'restaurant',
                category: 'Fast Food',
                image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
                description: 'Best pizza in town',
                location_address: 'Main Boulevard, Quetta',
                rating: 4.5,
                is_active: true,
                is_approved: true, // Auto-approve
                is_featured: true, // Correct column name confirmed by history
                location_lat: 30.1798,
                location_lng: 66.9750
            },
            {
                id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
                name: 'Burger King Quetta',
                type: 'restaurant',
                category: 'Burgers',
                image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
                description: 'Juicy burgers',
                location_address: 'Jinnah Road, Quetta',
                rating: 4.3,
                is_active: true,
                is_approved: true,
                is_featured: true,
                location_lat: 30.1830,
                location_lng: 66.9900
            },
            {
                id: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
                name: 'Biryani House',
                type: 'restaurant',
                category: 'Desi',
                image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400',
                description: 'Authentic biryani',
                location_address: 'Zarghoon Road, Quetta',
                rating: 4.7,
                is_active: true,
                is_approved: true,
                is_featured: true,
                location_lat: 30.2000,
                location_lng: 67.0100
            },
            {
                id: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
                name: 'Al-Noor Bakery',
                type: 'bakery',
                category: 'Bakery',
                image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
                description: 'Fresh bread and cakes',
                location_address: 'Samungli Road, Quetta',
                rating: 4.4,
                is_active: true,
                is_approved: true,
                is_featured: false,
                location_lat: 30.2100,
                location_lng: 67.0200
            }
        ]

        // Attempt insert
        const { error: busError } = await supabaseClient.from('businesses').insert(businesses);
        if (busError) {
            console.error("Business Insert Error:", busError);
            throw busError;
        }

        // 3. Insert Menu Items
        console.log("Inserting menu items...")
        const menuItems = [
            // Pizza Palace
            { business_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Pepperoni Pizza', price: 1200, image_url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400', category: 'Pizza', description: 'Classic', is_popular: true, is_available: true },
            { business_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Chicken Fajita', price: 1100, image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400', category: 'Pizza', description: 'Spicy', is_popular: true, is_available: true },
            // Burger King
            { business_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Zinger Burger', price: 550, image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', category: 'Burgers', description: 'Crispy', is_popular: true, is_available: true },
            // Biryani House
            { business_id: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', name: 'Chicken Biryani', price: 350, image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400', category: 'Biryani', description: 'Full plate', is_popular: true, is_available: true },
            // Al Noor
            { business_id: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', name: 'Chocolate Cake', price: 800, image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', category: 'Cakes', description: '1lb', is_popular: true, is_available: true }
        ]

        const { error: menuError } = await supabaseClient.from('menu_items').insert(menuItems);
        if (menuError) {
            console.error("Menu Insert Error:", menuError);
            throw menuError;
        }

        // 4. Insert Promo Banners
        console.log("Inserting promo banners...")
        const banners = [
            {
                heading_en: '50% OFF',
                heading_ur: '50% کی چھوٹ',
                description_en: 'First Order Special',
                description_ur: 'پہلا آرڈر خصوصی',
                background_type: 'image',
                background_value: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', // image_url -> background_value
                is_active: true,
                display_order: 1,
                click_action: 'restaurants'
            },
            {
                heading_en: 'Free Delivery',
                heading_ur: 'مفت ڈلیوری',
                description_en: 'Above 1000',
                description_ur: '1000 سے اوپر',
                background_type: 'gradient',
                background_value: 'linear-gradient(135deg, #ff6a00 0%, #ff3d00 100%)',
                is_active: true,
                display_order: 2,
                click_action: 'none'
            }
        ]

        const { error: bannerError } = await supabaseClient.from('promo_banners').insert(banners);
        if (bannerError) {
            console.error("Banner Insert Error:", bannerError);
            throw bannerError;
        }

        return new Response(
            JSON.stringify({ success: true, businesses: businesses.length, items: menuItems.length, banners: banners.length }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error) {
        console.error("Seed error catch:", error)
        return new Response(
            JSON.stringify({ error: error.message, details: error }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
        )
    }
})
