import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!;
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!;

interface PushRequest {
  title: string;
  message: string;
  targetRole?: string; // 'customer' | 'rider' | 'business' | 'admin' | null for all
  targetUserId?: string;
  actionRoute?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    const { title, message, targetRole, targetUserId, actionRoute }: PushRequest = await req.json();

    console.log('=== PUSH NOTIFICATION DEBUG ===');
    console.log('Request params:', { title, message, targetRole, targetUserId, actionRoute });

    // Build player IDs filter based on target
    let playerIds: string[] = [];
    let totalUsersInRole = 0;

    if (targetUserId) {
      // Single user target
      const { data: tokens, error } = await supabase
        .from('push_device_tokens')
        .select('device_token')
        .eq('user_id', targetUserId);
      
      console.log('Single user tokens query:', { targetUserId, tokens, error });
      playerIds = tokens?.map(t => t.device_token) || [];
      totalUsersInRole = 1;
    } else if (targetRole) {
      // Role-based target - get users with this role
      const { data: userRoles, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', targetRole);
      
      console.log(`Users with role '${targetRole}':`, { count: userRoles?.length || 0, error: roleError });
      totalUsersInRole = userRoles?.length || 0;
      
      const userIds = userRoles?.map(r => r.user_id) || [];
      
      if (userIds.length > 0) {
        const { data: tokens, error: tokenError } = await supabase
          .from('push_device_tokens')
          .select('device_token, user_id')
          .in('user_id', userIds);
        
        console.log(`Device tokens for ${targetRole}s:`, { 
          totalUsersInRole: userIds.length,
          usersWithTokens: [...new Set(tokens?.map(t => t.user_id) || [])].length,
          totalTokens: tokens?.length || 0,
          error: tokenError 
        });
        
        playerIds = tokens?.map(t => t.device_token) || [];
      }
    } else {
      // All users
      const { data: tokens, error } = await supabase
        .from('push_device_tokens')
        .select('device_token');
      
      console.log('All device tokens:', { count: tokens?.length || 0, error });
      playerIds = tokens?.map(t => t.device_token) || [];
    }

    console.log(`Found ${playerIds.length} device tokens to notify`);

    let successCount = 0;
    let failureCount = 0;

    if (playerIds.length > 0) {
      // Send via OneSignal
      const oneSignalPayload: Record<string, unknown> = {
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: playerIds,
        headings: { en: title },
        contents: { en: message },
      };

      if (actionRoute) {
        oneSignalPayload.data = { route: actionRoute };
        oneSignalPayload.url = actionRoute;
      }

      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify(oneSignalPayload),
      });

      const result = await response.json();
      console.log('OneSignal response:', result);

      if (result.id) {
        successCount = result.recipients || playerIds.length;
      } else {
        failureCount = playerIds.length;
        console.error('OneSignal error:', result.errors);
      }
    }

    // Log the notification in database
    const { error: logError } = await supabase
      .from('push_notifications')
      .insert({
        title,
        message,
        target_role: targetRole || null,
        target_user_id: targetUserId || null,
        action_route: actionRoute || null,
        sent_by: user.id,
        success_count: successCount,
        failure_count: failureCount,
      });

    if (logError) {
      console.error('Failed to log notification:', logError);
    }

    // Also create in-app notifications for recipients
    if (targetUserId) {
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        title,
        message,
        type: 'system',
      });
    } else if (targetRole) {
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', targetRole);
      
      const notifications = userRoles?.map(r => ({
        user_id: r.user_id,
        title,
        message,
        type: 'system',
      })) || [];
      
      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }
    } else {
      // Send to all - use the send_system_notification function
      await supabase.rpc('send_system_notification', {
        _title: title,
        _message: message,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        failed: failureCount,
        message: `Push sent to ${successCount} devices` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Push notification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});