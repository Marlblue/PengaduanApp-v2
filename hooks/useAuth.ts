import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { AuthState } from "../types/database.types";

export function useAuth(): AuthState & { refreshUser: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        setState((prev: AuthState) => ({ ...prev, loading: false }));
        return;
      }

      if (profile.status === "deleted" || profile.status === "rejected") {
        await supabase.auth.signOut();
        setState({ user: null, session: null, loading: false });
        return;
      }

      setState((prev: AuthState) => ({
        ...prev,
        user: profile,
        loading: false,
      }));
    } catch (error) {
      console.error("Error in fetchProfile:", error);
      setState((prev: AuthState) => ({ ...prev, loading: false }));
    }
  };

  const refreshUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      setState((prev: AuthState) => ({ ...prev, session }));
      await fetchProfile(session.user.id);
    }
  };

  useEffect(() => {
    // Get initial session
    const initSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          setState((prev: AuthState) => ({ ...prev, session }));
          fetchProfile(session.user.id);
        } else {
          setState({ user: null, session: null, loading: false });
        }
      } catch (err) {
        console.error("Session check failed:", err);
        setState({ user: null, session: null, loading: false });
      }
    };

    initSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setState((prev: AuthState) => ({ ...prev, session }));
        await fetchProfile(session.user.id);
      } else {
        setState({ user: null, session: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    ...state,
    refreshUser,
  };
}
