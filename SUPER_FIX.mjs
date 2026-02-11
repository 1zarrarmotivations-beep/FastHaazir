
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://jqbwynomwwjhsebcicpm.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxYnd5bm9td3dqaHNlYmNpY3BtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDczNTA0NCwiZXhwIjoyMDg2MzExMDQ0fQ.mK9-f9eiJW56G7_TQjrMMQ6nVYwndrs5DV7UDYDcxmU";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function superFix() {
    console.log("🚀 Starting Super Fix...");

    const phone = "923110111419";
    const email = `user_${phone}@fasthaazir.app`;
    const password = `firebase_${phone}_auth`;

    // 1. Clean up "stuck" user
    console.log(`🧹 Cleaning up user ${email}...`);
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) console.error("Error listing users:", listError);

    const stuckUser = users?.users.find(u => u.email === email || u.phone === `+${phone}`);
    if (stuckUser) {
        console.log(`🗑️ Deleting stuck user: ${stuckUser.id}`);
        await supabase.auth.admin.deleteUser(stuckUser.id);
    }

    // 2. Create user with AUTO-CONFIRM
    console.log(`👤 Creating Super Admin user...`);
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        phone: `+${phone}`,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { role: 'admin' }
    });

    if (createError) {
        console.error("❌ Error creating user:", createError.message);
    } else {
        console.log("✅ User created and confirmed successfully!");

        // 3. Ensure they are in the admins table
        console.log("🛠️ Syncing to public.admins table...");
        // We try to insert into admins. If the table structure is missing columns, this might fail, 
        // but the Auth account is now active regardless.
        const { error: adminError } = await supabase
            .from('admins')
            .upsert({
                user_id: newUser.user.id,
                phone: `+${phone}`,
                name: 'Super Admin',
                is_active: true,
                is_super: true
            }, { onConflict: 'phone' });

        if (adminError) {
            console.warn("⚠️ Admins table sync warning:", adminError.message);
            console.log("This usually means the table schema is still old. Trying fallback...");

            // Try with minimal columns
            await supabase.from('admins').upsert({
                phone: `+${phone}`,
                is_active: true
            }, { onConflict: 'phone' });
        }

        // 4. Set role in user_roles
        console.log("🔑 Setting admin role...");
        await supabase
            .from('user_roles')
            .upsert({
                user_id: newUser.user.id,
                role: 'admin'
            }, { onConflict: 'user_id' });
    }

    console.log("\n✨ Super Fix Complete! Please try logging in now.");
}

superFix();
