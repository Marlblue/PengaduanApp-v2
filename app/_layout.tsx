import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, LogBox, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-url-polyfill/auto";

// Ignore specific warnings
LogBox.ignoreLogs([
  "ImagePicker.MediaTypeOptions have been deprecated",
  "Unable to activate keep awake",
]);

import { OfflineBanner } from "../components/OfflineBanner";
import { useAuth } from "../hooks/useAuth";
import { useDeepLinks } from "../hooks/useDeepLinks";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useNotifications } from "../hooks/useNotifications";

export default function RootLayout() {
  const { isOffline } = useNetworkStatus();
  const { user, loading: authLoading } = useAuth();

  // Initialize notification listener
  useNotifications();

  const segments = useSegments() as string[];
  const router = useRouter();

  // Handle Supabase deep links (auth tokens)
  useDeepLinks();

  useEffect(() => {
    if (authLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const isResetPassword = segments[1] === "reset-password";
    const isIndex =
      segments.length === 0 ||
      (segments.length === 1 && segments[0] === "index");

    const role = user?.role;

    if (!user) {
      // If user is not logged in, redirect to login page for protected routes
      if (!inAuthGroup && !isIndex) {
        router.replace("/(auth)/login");
      }
    } else if (role) {
      // User is logged in and has a role

      // 1. Redirect from Auth/Index pages to Dashboard
      if (inAuthGroup || isIndex) {
        // Allow authenticated users to stay on reset-password page
        if (isResetPassword) return;

        // Redirect based on ROLE
        if (role === "admin") {
          router.replace("/(admin)/dashboard");
        } else if (role === "petugas") {
          router.replace("/(petugas)/dashboard");
        } else {
          // Default: Masyarakat
          router.replace("/(masyarakat)/home");
        }
      }
      // 2. Access Control: Prevent users from accessing other roles' routes
      else {
        const currentGroup = segments[0];

        if (currentGroup === "(admin)" && role !== "admin") {
          // Redirect unauthorized access to Admin routes
          if (role === "petugas") router.replace("/(petugas)/dashboard");
          else router.replace("/(masyarakat)/home");
        } else if (currentGroup === "(petugas)" && role !== "petugas") {
          // Redirect unauthorized access to Petugas routes
          if (role === "admin") router.replace("/(admin)/dashboard");
          else router.replace("/(masyarakat)/home");
        } else if (currentGroup === "(masyarakat)" && role !== "masyarakat") {
          // Redirect unauthorized access to Masyarakat routes
          if (role === "admin") router.replace("/(admin)/dashboard");
          else if (role === "petugas") router.replace("/(petugas)/dashboard");
        }
      }
    }
  }, [user, authLoading, segments]);

  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <OfflineBanner visible={isOffline} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(masyarakat)" />
        <Stack.Screen name="(petugas)" />
        <Stack.Screen name="(admin)" />
      </Stack>
    </SafeAreaProvider>
  );
}
