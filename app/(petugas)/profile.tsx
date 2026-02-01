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

export default function PetugasProfile() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { visible, message, type, showToast, hideToast } = useToast();
  const [imageError, setImageError] = useState(false);

  const handleLogout = async () => {
    Alert.alert("Konfirmasi", "Apakah Anda yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            showToast(error.message, "error");
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Hapus Akun",
      "Apakah Anda yakin ingin menghapus akun? Anda tidak akan bisa mengakses tugas lagi.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.rpc("delete_own_account");

              if (error) throw error;

              await supabase.auth.signOut();
            } catch (error: any) {
              Alert.alert("Gagal", "Gagal menghapus akun.");
            }
          },
        },
      ]
    );
  };

  if (authLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.secondary} />
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

  const profile = user;

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
                  profile?.full_name || "Petugas",
                )}&background=random&size=200`,
              }}
              style={styles.avatar}
              onError={() => setImageError(true)}
            />
          )}
        </View>
        <Text style={styles.name}>{profile?.full_name || "Nama Petugas"}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>PETUGAS LAPANGAN</Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoItem}>
          <Ionicons name="mail-outline" size={24} color={Colors.secondary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <Ionicons name="call-outline" size={24} color={Colors.secondary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Nomor Telepon</Text>
            <Text style={styles.infoValue}>{profile?.phone || "-"}</Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <Ionicons
            name="calendar-outline"
            size={24}
            color={Colors.secondary}
          />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Bergabung Sejak</Text>
            <Text style={styles.infoValue}>
              {new Date(user?.created_at || Date.now()).toLocaleDateString(
                "id-ID",
                {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                },
              )}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutText}>Keluar</Text>
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
    borderBottomColor: "#f0f0f0",
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    backgroundColor: Colors.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  infoSection: {
    padding: 20,
    backgroundColor: "#fff",
    marginTop: 20,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.text,
  },
  logoutButton: {
    margin: 20,
    backgroundColor: "#E74C3C",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
