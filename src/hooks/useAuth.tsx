import { useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Clear all auth-related storage
 */
const clearAuthStorage = () => {
  // Clear localStorage items related to auth
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.includes('supabase') || 
      key.includes('firebase') || 
      key.includes('auth') ||
      key.includes('sb-')
    )) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Clear sessionStorage
  sessionStorage.clear();
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("[useAuth] Auth state changed:", event);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    console.log("[useAuth] Signing out...");
    
    // Try to set rider offline before signing out
    if (user) {
      try {
        await supabase
          .from('riders')
          .update({ is_online: false, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
        console.log("[useAuth] Rider set to offline");
      } catch (error) {
        console.log("[useAuth] No rider profile to update or error:", error);
      }
    }
    
    // Sign out from Supabase first
    await supabase.auth.signOut();
    
    // Clear all auth storage
    clearAuthStorage();
    
    // Reset state
    setUser(null);
    setSession(null);
    
    console.log("[useAuth] Signed out and cleared storage");
  }, [user]);

  return { user, session, loading, signOut };
};
