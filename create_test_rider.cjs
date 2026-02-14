
const { createClient } = require('./frontend/node_modules/@supabase/supabase-js');

const supabaseUrl = 'https://jqbwynomwwjhsebcicpm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxYnd5bm9td3dqaHNlYmNpY3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MzUwNDQsImV4cCI6MjA4NjMxMTA0NH0.VMgXx4832iuzP2uLO-YmQ-OHggPLS04nJ2nwHH2nWgY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestRider() {
    const email = 'rider_final_test@fasthaazir.com';
    const password = 'password123';

    console.log(`Creating user: ${email}`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.error('Error creating user:', error);
        return;
    }

    console.log('User created successfully:', data.user.id);
    console.log('USER_ID:', data.user.id);
}

createTestRider();
