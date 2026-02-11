import { useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

/**
 * Clear ALL storage completely - no ghost sessions
 */
const clearAllStorage = () => {
  console.log("[useAuth] Clearing all storage...");

  // Preserve important non-auth flags
  const onboardingCompleted = localStorage.getItem('fasthaazir_onboarding_completed');

  // Clear entire localStorage
  localStorage.clear();

  // Restore non-auth flags
  if (onboardingCompleted) {
    localStorage.setItem('fasthaazir_onboarding_completed', onboardingCompleted);
  }

  // Clear entire sessionStorage
  sessionStorage.clear();

  // Clear IndexedDB entries for Firebase/Supabase (async, fire-and-forget)
  try {
    if (typeof indexedDB !== 'undefined') {
      indexedDB.databases?.()?.then(dbs => {
        dbs?.forEach(db => {
          if (db.name && (
            db.name.includes('firebase') ||
            db.name.includes('supabase') ||
            db.name.includes('auth')
          )) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      });
    }
  } catch (e) {
    // IndexedDB not available or error, continue
  }

  console.log("[useAuth] All storage cleared");
};

/**
 * Clear all React Query cache
 */
const clearQueryCache = (queryClient: ReturnType<typeof useQueryClient>) => {
  console.log("[useAuth] Clearing React Query cache...");
  queryClient.clear();
  console.log("[useAuth] React Query cache cleared");
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("[useAuth] Auth state changed:", event);

        // On SIGNED_OUT event, ensure state is cleared
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

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

  const signOut = useCallback(async (navigate?: ReturnType<typeof useNavigate>) => {
    console.log("[useAuth] Starting global sign out...");

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

    // Sign out from Supabase with GLOBAL scope - terminates all sessions
    try {
      // 1. Also try to sign out from Firebase if it's active
      // We do this dynamically to avoid circular dependencies if any
      try {
        const { getAuth, signOut: firebaseSignOut } = await import('firebase/auth');
        const auth = getAuth();
        if (auth) {
          await firebaseSignOut(auth);
          console.log("[useAuth] Firebase sign out complete");
        }
      } catch (fError) {
        console.log("[useAuth] Firebase sign out skipped or failed:", fError);
      }

      // 2. Supabase Global Sign Out
      await supabase.auth.signOut({ scope: 'global' });
      console.log("[useAuth] Supabase global sign out complete");
    } catch (error) {
      console.error("[useAuth] Sign out error:", error);
      // Continue with cleanup even if sign out fails
    }

    // Clear React Query cache
    clearQueryCache(queryClient);

    // Clear all storage
    clearAllStorage();

    // Reset state immediately
    setUser(null);
    setSession(null);

    console.log("[useAuth] Sign out complete - all state cleared");

    // Navigate to auth if navigate function provided
    if (navigate) {
      navigate('/auth', { replace: true });
    }

    return true;
  }, [user, queryClient]);

  return { user, session, loading, signOut };
};
