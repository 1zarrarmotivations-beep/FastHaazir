
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Secret Key Resolution
        const sbUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL') || '';
        const sbServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || '';

        if (!sbUrl || !sbServiceKey) {
            throw new Error("Missing Supabase Secrets (URL or Service Role Key)");
        }

        // 2. Initialize Admin Client
        const supabaseAdmin = createClient(
            sbUrl,
            sbServiceKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // 3. Parse Request
        const { email, password, phone, role, userData } = await req.json()
        console.log(`[Request] Creating user: ${email || phone}, Role: ${role}`);

        // SECURITY CHECK: If creating privileged user, valid JWT required
        if (role === 'admin' || role === 'operator') {
            const authHeader = req.headers.get('Authorization');
            const token = authHeader?.replace('Bearer ', '');
            if (!token) {
                return new Response(JSON.stringify({ success: false, error: "Authentication required for privileged roles" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
            }
            const { data: { user: caller }, error: tokenError } = await supabaseAdmin.auth.getUser(token);
            if (tokenError || !caller) {
                return new Response(JSON.stringify({ success: false, error: "Invalid Authentication Token" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
            }
        }

        // Normalize Phone for Auth (E.164 required)
        let formattedPhone = phone || userData?.phone || '';
        if (formattedPhone) {
            // Remove non-digit chars
            formattedPhone = formattedPhone.replace(/\D/g, '');

            // Pakistan/Common Logic:
            // 03001234567 (11 digits) -> +923001234567
            if (formattedPhone.length === 11 && formattedPhone.startsWith('03')) {
                formattedPhone = '+92' + formattedPhone.substring(1);
            }
            // 923001234567 (12 digits) -> +923001234567
            else if (formattedPhone.length === 12 && formattedPhone.startsWith('92')) {
                formattedPhone = '+' + formattedPhone;
            }
            // Fallback: If not starting with + but looks long enough, prepend +
            else if (formattedPhone.length >= 10 && !formattedPhone.startsWith('+')) {
                formattedPhone = '+' + formattedPhone;
            }
        }

        // 4. Create Auth User
        const { data: user, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
            email: email || undefined,
            password: password || undefined,
            phone: formattedPhone || undefined,
            email_confirm: true,
            phone_confirm: true,
            user_metadata: { ...userData, role },
        })

        if (createUserError) {
            console.error("[Error] Auth creation failed:", createUserError);
            return new Response(
                JSON.stringify({ success: false, error: "Auth Error: " + createUserError.message }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        if (!user.user) {
            return new Response(
                JSON.stringify({ success: false, error: "User creation failed, no user returned" }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        console.log(`[Success] Auth User created: ${user.user.id}`);

        // 5. Insert Profile (Bypass RLS)
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                user_id: user.user.id,
                email: email || null,
                phone: formattedPhone || user.user.phone,
                role: role || 'customer',
                status: 'active',
                full_name: userData?.name,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })

        if (profileError) {
            console.error("[Error] Profile creation failed:", profileError);
        }

        // 6. insert into public.riders if role is rider
        if (role === 'rider') {
            console.log(`[Request] Inserting into riders table for user: ${user.user.id}`);
            // Ensure phone is digits only (or same E.164) for DB. 
            // Admin panel might expect E.164 or plain digits. 
            // Let's use formattedPhone (E.164) for consistency, or strip?
            // Let's force strip for 'phone' column in riders table if it's typically digits-only.
            // But E.164 is safer. I'll use E.164.

            const { error: riderError } = await supabaseAdmin
                .from('riders')
                .upsert({
                    user_id: user.user.id,
                    name: userData?.name,
                    phone: formattedPhone, // Use Normalized
                    email: email || undefined, // Save email for account claiming
                    vehicle_type: userData?.vehicle_type || 'Bike',
                    cnic: userData?.cnic,
                    cnic_front: userData?.cnic_front,
                    cnic_back: userData?.cnic_back,
                    license_image: userData?.license_image,
                    commission_rate: userData?.commission_rate !== undefined ? userData.commission_rate : 10,
                    is_active: userData?.is_active ?? false,
                    verification_status: userData?.verification_status || 'pending',
                    is_online: false,
                    updated_at: new Date().toISOString()
                });

            if (riderError) {
                console.error("[Error] Rider table insert failed:", riderError);
                return new Response(
                    JSON.stringify({ success: false, error: "Created User but failed to create Rider Profile: " + riderError.message }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
                )
            }
        }

        // 7. Insert into user_roles (Explicit for Role Resolution)
        // This ensures resolve_role_by_email/phone finds the role immediately
        if (role) {
            const { error: roleError } = await supabaseAdmin
                .from('user_roles')
                .upsert({
                    user_id: user.user.id,
                    role: role
                });
            if (roleError) {
                console.error("[Error] user_roles insert failed:", roleError);
            }
        }

        // 7. Return Success
        return new Response(
            JSON.stringify({
                success: true,
                data: { user: user.user },
                message: "User created successfully"
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error("[Fatal Error] Edge Function Exception:", error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
