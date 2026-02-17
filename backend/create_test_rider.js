
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createTestRider() {
    const email = 'fasthaazir@rider1.com';
    const password = 'fastrider1';

    try {
        // 1. Check if user already exists
        const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;

        const existingUser = listData.users.find(u => u.email === email);

        let userId;

        if (existingUser) {
            console.log('User already exists, updating password...');
            userId = existingUser.id;
            const { error: updateError } = await supabase.auth.admin.updateUserById(
                userId,
                { password: password, email_confirm: true }
            );
            if (updateError) throw updateError;
        } else {
            console.log('Creating new user...');
            const { data: createData, error: createError } = await supabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true,
                user_metadata: { role: 'rider' }
            });
            if (createError) throw createError;
            userId = createData.user.id;
        }

        console.log('SUCCESS_USER_ID:', userId);

    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

createTestRider();
