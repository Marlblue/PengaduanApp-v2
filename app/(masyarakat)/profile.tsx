import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Toast } from "../../components/Toast";
import { Colors } from "../../constants/Colors";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { supabase } from "../../lib/supabase";
import { stringToColor } from "../../lib/utils";
import { Database } from "../../types/database.types";
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function MasyarakatProfile() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { visible, message, type, showToast, hideToast } = useToast();
  const [imageError, setImageError] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showToast(error.message, "error");
    }
    // Auth state change in _layout will handle redirect
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Hapus Akun",
      "Apakah Anda yakin ingin menghapus akun? Tindakan ini tidak dapat dibatalkan.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              // Call the RPC function to delete everything (Hard Delete)
              const { error } = await supabase.rpc("delete_own_account");

              if (error) throw error;

              // Sign out locally
              await supabase.auth.signOut();
              showToast("Akun dan semua data berhasil dihapus permanen", "success");
            } catch (error: any) {
              showToast("Gagal menghapus akun: " + error.message, "error");
            }
          },
        },
      ]
    );
  };

  if (authLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={{ color: Colors.text }}>Tidak ada data pengguna.</Text>
      </View>
    );
  }

  const profile = user as Profile;

  return (
    <ScrollView style={styles.container}>
      <Toast
        visible={visible}
        message={message}
        type={type}
        onHide={hideToast}
      />
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {imageError ? (
            <Ionicons name="person" size={60} color="#fff" />
          ) : (
            <Image
              source={{
                uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  profile?.full_name || "User",
                )}&background=${stringToColor(
                  profile?.full_name || "User",
                )}&color=fff&size=200`,
              }}
              style={styles.avatar}
              onError={() => setImageError(true)}
            />
          )}
        </View>
        <Text style={[styles.name, { color: Colors.text }]}>
          {profile?.full_name || "Pengguna"}
        </Text>
        <Text style={styles.role}>Masyarakat</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informasi Akun</Text>

        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={24} color={Colors.textLight} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile?.email}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={24} color={Colors.textLight} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>No. Telepon</Text>
            <Text style={styles.infoValue}>{profile?.phone || "-"}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons
            name="calendar-outline"
            size={24}
            color={Colors.textLight}
          />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Bergabung Sejak</Text>
            <Text style={styles.infoValue}>
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString("id-ID")
                : "-"}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#fff" />
        <Text style={styles.logoutText}>Keluar</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: "transparent", marginTop: 0, borderWidth: 1, borderColor: "#EF4444" }]}
        onPress={handleDeleteAccount}
      >
        <Ionicons name="trash-outline" size={24} color="#EF4444" />
        <Text style={[styles.logoutText, { color: "#EF4444" }]}>Hapus Akun</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
  },
  role: {
    fontSize: 16,
    color: Colors.textLight,
    marginTop: 4,
  },
  section: {
    padding: 20,
    backgroundColor: "#fff",
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  infoContent: {
    marginLeft: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.text,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    backgroundColor: "#E74C3C",
    margin: 20,
    padding: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  logoutText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
