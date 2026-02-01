import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import Constants, { ExecutionEnvironment } from 'expo-constants';

// NOTE: expo-notifications is NOT supported in Expo Go (SDK 53+).
// We must lazy-load it or mock it to prevent crashes during development in Expo Go.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: any;

if (!isExpoGo) {
  try {
    Notifications = require("expo-notifications");
  } catch (error) {
    console.error("Failed to load expo-notifications:", error);
  }
} else {
  // Mock implementation for Expo Go
  console.log("Expo Go detected: Mocking expo-notifications to prevent crash.");
  Notifications = {
    setNotificationHandler: () => {},
    scheduleNotificationAsync: async () => {},
    addNotificationReceivedListener: () => ({ remove: () => {} }),
    addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
    setNotificationChannelAsync: async () => {},
    getPermissionsAsync: async () => ({ status: 'denied' }),
    requestPermissionsAsync: async () => ({ status: 'denied' }),
    AndroidImportance: { MAX: 5 },
  };
}

// Only set handler if not in Expo Go and Notifications is loaded
if (!isExpoGo && Notifications?.setNotificationHandler) {
  Notifications.setNotificationHandler({
    handleNotification: async () =>
      ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }) as any,
  });
}

export function useNotifications() {
  const { user: profile } = useAuth();
  // Use 'any' for the ref type because we aren't importing the static type anymore
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    registerForPushNotificationsAsync().catch((err) =>
      console.log("Push Notification Setup Failed (Expo Go?):", err),
    );

    if (Notifications && Notifications.addNotificationReceivedListener) {
      notificationListener.current =
        Notifications.addNotificationReceivedListener((notification: any) => {});
    }
    
    if (Notifications && Notifications.addNotificationResponseReceivedListener) {
      responseListener.current =
        Notifications.addNotificationResponseReceivedListener((response: any) => {});
    }

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  // Realtime Listener untuk Supabase
  useEffect(() => {
    if (!profile) return;

    console.log("Setting up realtime notification listener for", profile.role);

    const channel = supabase
      .channel("public:pengaduan")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen semua event (INSERT, UPDATE)
          schema: "public",
          table: "pengaduan",
        },
        async (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;

          // LOGIC 1: Untuk Masyarakat - Notifikasi Update Status
          if (profile.role === "masyarakat" && newData.user_id === profile.id) {
            // Cek apakah status berubah
            if (oldData && newData.status !== oldData.status) {
              await schedulePushNotification(
                "Update Status Laporan",
                `Laporan "${newData.judul}" statusnya berubah menjadi: ${getStatusLabel(newData.status)}`,
              );
            }
          }

          // LOGIC 2: Untuk Petugas - Notifikasi Tugas Baru
          if (profile.role === "petugas" && newData.petugas_id === profile.id) {
            // Jika baru saja di-assign (sebelumnya null atau petugas lain)
            if (
              newData.status === "assigned" &&
              (!oldData || oldData.petugas_id !== profile.id)
            ) {
              await schedulePushNotification(
                "Tugas Baru",
                `Anda mendapatkan tugas baru: "${newData.judul}"`,
              );
            }
          }

          // LOGIC 3: Untuk Admin - Notifikasi Laporan Baru Masuk
          if (profile.role === "admin" && payload.eventType === "INSERT") {
            await schedulePushNotification(
              "Laporan Baru Masuk",
              `Ada laporan baru: "${newData.judul}" perlu verifikasi.`,
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  return {};
}

async function schedulePushNotification(title: string, body: string) {
  if (isExpoGo || !Notifications) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { data: "goes here" },
      },
      trigger: null, // null means show immediately
    });
  } catch (error) {
    console.log("Error scheduling notification:", error);
  }
}

async function registerForPushNotificationsAsync() {
  if (isExpoGo) {
    console.log("Push notifications are not fully supported in Expo Go");
    return;
  }

  if (!Notifications) return;

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      // console.log('Failed to get push token for push notification!');
      return;
    }
  } catch (error) {
    console.log("Error in registerForPushNotificationsAsync:", error);
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Menunggu Verifikasi";
    case "verified":
      return "Terverifikasi";
    case "assigned":
      return "Diproses Petugas";
    case "in_progress":
      return "Sedang Dikerjakan";
    case "completed":
      return "Selesai";
    case "rejected":
      return "Ditolak";
    default:
      return status;
  }
}
