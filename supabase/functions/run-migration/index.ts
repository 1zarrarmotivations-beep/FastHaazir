import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { sql } = await req.json()

        if (!sql) {
            return new Response(JSON.stringify({ error: 'SQL query is required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Execute the SQL using supabase.rpc for direct SQL would require pg_exec
        // Since we can't run arbitrary SQL, we'll use a workaround with individual operations

        // For this migration, let's run specific operations
        const results: any[] = []

        // Parse and execute individual statements
        const statements = sql.split(';').filter(s => s.trim())

        for (const statement of statements) {
            const trimmedStmt = statement.trim()
            if (!trimmedStmt) continue

            try {
                // Try to execute via postgrest - this is limited
                // For full SQL, we'd need pg_exec extension
                results.push({ statement: trimmedStmt.substring(0, 50), status: 'skipped - use Supabase SQL Editor' })
            } catch (e: any) {
                results.push({ statement: trimmedStmt.substring(0, 50), error: e.message })
            }
        }

        return new Response(JSON.stringify({
            message: 'Migration helper - please run SQL in Supabase SQL Editor',
            sql: sql,
            note: 'Supabase REST API does not support direct SQL execution. Please run the SQL in your Supabase dashboard SQL Editor.'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
