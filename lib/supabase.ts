import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = "https://wgtanjijhfmlggpgxzxy.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndndGFuamlqaGZtbGdncGd4enh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0Nzk1ODIsImV4cCI6MjA3OTA1NTU4Mn0.dJWFadetQHzhk4-fW_ocTY4hxxYtIy5LaejIMcN0mwQ";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Storage bucket names
export const STORAGE_BUCKETS = {
  PENGADUAN_PHOTOS: "pengaduan-photos",
};
