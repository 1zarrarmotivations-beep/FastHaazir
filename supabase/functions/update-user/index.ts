
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
        const sbUrl = Deno.env.get('SUPABASE_URL') || '';
        const sbServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

        const supabaseAdmin = createClient(sbUrl, sbServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        const { userId, email, password, phone, role, status } = await req.json()
        console.log(`[Request] Updating user: ${userId}`);

        // 1. Update Auth User
        const updateData: any = {};
        if (email) updateData.email = email;
        if (password) updateData.password = password;
        if (phone) updateData.phone = phone;
        if (role) updateData.user_metadata = { ...updateData.user_metadata, role };

        const { data: user, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            updateData
        )

        if (authError) throw authError;

        // 2. Update Profile
        const profileUpdates: any = {};
        if (role) profileUpdates.role = role;
        if (status) profileUpdates.status = status;
        if (email) profileUpdates.email = email;
        if (phone) profileUpdates.phone = phone;

        if (Object.keys(profileUpdates).length > 0) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update(profileUpdates)
                .eq('user_id', userId);

            if (profileError) throw profileError;
        }

        return new Response(
            JSON.stringify({ success: true, message: "User updated successfully" }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error("[Fatal Error]", error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
