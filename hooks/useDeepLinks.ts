import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useDeepLinks() {
  useEffect(() => {
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;

      try {
        // Handle Implicit Flow (Hash Fragment)
        // URL: pengaduanappv2://...?#access_token=...&refresh_token=...
        if (url.includes("access_token") && url.includes("refresh_token")) {
          const hashIndex = url.indexOf("#");
          if (hashIndex !== -1) {
            const hash = url.substring(hashIndex + 1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get("access_token");
            const refreshToken = params.get("refresh_token");
            const type = params.get("type");

            if (accessToken && refreshToken) {
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (error) {
                console.error("Error setting session (implicit):", error);
              }
              
              // Force navigation if it's a recovery flow
              if (type === "recovery") {
                router.replace("/(auth)/reset-password");
              }
              
              // Navigation handled by onAuthStateChange listener below
              return;
            }
          }
        }

        // Handle PKCE Flow (Query Params)
        // URL: pengaduanappv2://...?code=...
        const queryIndex = url.indexOf("?");
        if (queryIndex !== -1) {
          const query = url.substring(queryIndex + 1);
          const params = new URLSearchParams(query);
          const code = params.get("code");

          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error)
              console.error("Error exchanging code for session:", error);
            return;
          }
        }
      } catch (error) {
        console.error("Error handling deep link:", error);
      }
    };

    // Handle initial URL (if app was closed)
    Linking.getInitialURL().then(handleDeepLink);

    // Handle incoming URLs (if app was in background)
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    // Listen for Password Recovery event
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        router.replace("/(auth)/reset-password");
      }
    });

    return () => {
      subscription.remove();
      authListener.subscription.unsubscribe();
    };
  }, []);
}
