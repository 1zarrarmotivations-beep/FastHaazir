
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://jqbwynomwwjhsebcicpm.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // I don't have this, but maybe I can use the provided access token or just advise the user.

async function addAdmin() {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
        console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
        return;
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabase
        .from('admins')
        .upsert({
            phone: '+923110111419',
            name: 'Default Admin',
            is_active: true
        }, { onConflict: 'phone' });

    if (error) console.error("Error adding admin:", error);
    else console.log("Admin added successfully:", data);
}
