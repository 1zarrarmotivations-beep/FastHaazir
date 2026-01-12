import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // These are Firebase publishable keys - safe for client use
    const config = {
      apiKey: Deno.env.get("VITE_FIREBASE_API_KEY") || "",
      authDomain: Deno.env.get("VITE_FIREBASE_AUTH_DOMAIN") || "",
      projectId: Deno.env.get("VITE_FIREBASE_PROJECT_ID") || "",
      appId: Deno.env.get("VITE_FIREBASE_APP_ID") || "",
    };

    // Check if all required config values are present
    const isValid = config.apiKey && config.authDomain && config.projectId && config.appId;

    return new Response(
      JSON.stringify({ 
        success: true, 
        config,
        isValid 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error fetching Firebase config:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Failed to fetch configuration" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
