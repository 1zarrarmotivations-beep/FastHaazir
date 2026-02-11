
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
    const envPath = path.join(__dirname, '.env');
    console.log("Reading env from:", envPath);

    if (!fs.existsSync(envPath)) {
        console.error(".env file not found!");
        process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const env = {};

    const lines = envContent.replace(/\r\n/g, '\n').split('\n');

    lines.forEach(line => {
        if (line.trim().startsWith('#')) return;
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            let value = parts.slice(1).join('=').trim();
            value = value.replace(/^["']|["']$/g, '');
            if (key) env[key] = value;
        }
    });

    console.log("Keys loaded:", Object.keys(env));

    const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
    const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error("Missing keys.");
        process.exit(1);
    }

    const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/seed-data`;

    console.log(`Calling seed function at ${FUNCTION_URL}...`);

    const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`Error ${response.status}: ${text}`);
    } else {
        const data = await response.json();
        console.log("Success:", JSON.stringify(data, null, 2));
    }
} catch (e) {
    console.error("Script failed:", e);
}
