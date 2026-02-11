
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://jqbwynomwwjhsebcicpm.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxYnd5bm9td3dqaHNlYmNpY3BtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDczNTA0NCwiZXhwIjoyMDg2MzExMDQ0fQ.mK9-f9eiJW56G7_TQjrMMQ6nVYwndrs5DV7UDYDcxmU";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function addEmailAdmin() {
    console.log("🚀 Adding Admin Email Fix...");

    const targetEmail = "1zarrarmotivations@gmail.com";
    const userId = "2af75473-006e-441b-a105-5ed53961dbbc";

    // 1. Ensure columns exist (just in case)
    const { error: alterError } = await supabase.rpc('admin_run_sql', {
        sql: `ALTER TABLE IF EXISTS public.admins ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;`
    });
    // Note: rpc admin_run_sql might not exist, but we can try direct upsert if table allows

    // 2. Add as Admin in public.admins
    console.log(`🛠️ Inserting ${targetEmail} into public.admins...`);
    const { error: upsertError } = await supabase
        .from('admins')
        .upsert({
            user_id: userId,
            email: targetEmail,
            name: 'Zarrar Admin',
            is_active: true,
            is_super: true, // Making them super for full access
            phone: '00000000000' // Placeholder unique phone if required
        }, { onConflict: 'email' });

    if (upsertError) {
        console.error("❌ Error upserting admin:", upsertError.message);
    }

    // 3. Grant Admin Role in user_roles
    console.log(`🔑 Granting 'admin' role to ${userId}...`);
    const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
            user_id: userId,
            role: 'admin'
        }, { onConflict: 'user_id' });

    if (roleError) {
        console.error("❌ Error granting role:", roleError.message);
    } else {
        console.log("✅ Admin role granted successfully!");
    }

    console.log("\n✨ Done! When you sign in with Google now, you will be an Admin.");
}

addEmailAdmin();
