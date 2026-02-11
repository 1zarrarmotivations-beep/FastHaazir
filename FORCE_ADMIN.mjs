
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://jqbwynomwwjhsebcicpm.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxYnd5bm9td3dqaHNlYmNpY3BtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDczNTA0NCwiZXhwIjoyMDg2MzExMDQ0fQ.mK9-f9eiJW56G7_TQjrMMQ6nVYwndrs5DV7UDYDcxmU";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function forceAdmin() {
    console.log("🚀 Forcing Admin Role for Zarrar...");

    const mainEmail = "1zarrarmotivations@gmail.com";
    const shadowEmail = "firebase_1zarrarmotivations_gmail_com@fasthaazir.app";

    // 1. Get User IDs
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error("Error listing users:", listError);
        return;
    }

    const targetUsers = users.filter(u => u.email === mainEmail || u.email === shadowEmail);
    console.log(`Found ${targetUsers.length} matching accounts.`);

    for (const user of targetUsers) {
        console.log(`🛠️ Processing User: ${user.email} (${user.id})`);

        // Force Admin in public.admins
        await supabase.from('admins').upsert({
            user_id: user.id,
            email: user.email,
            is_active: true,
            is_super: true,
            name: 'Zarrar Admin'
        }, { onConflict: 'email' });

        // Force Admin in user_roles
        // Note: We use 'admin' as text to match your text-based column
        const { error: roleError } = await supabase.from('user_roles').upsert({
            user_id: user.id,
            role: 'admin'
        }, { onConflict: 'user_id' });

        if (roleError) console.error("Role Error:", roleError.message);
        else console.log("✅ Admin role forced!");
    }

    console.log("\n✨ System Synchronized. PLEASE LOG OUT AND LOG IN AGAIN ON THE WEB APP.");
}

forceAdmin();
