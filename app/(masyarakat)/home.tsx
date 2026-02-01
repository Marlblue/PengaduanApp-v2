import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "../../constants/Colors";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { stringToColor } from "../../lib/utils";
import { Database } from "../../types/database.types";

type Pengaduan = Database["public"]["Tables"]["pengaduan"]["Row"] & {
  kategori: { nama: string } | null;
};

export default function MasyarakatHome() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    process: 0,
  });
  const [recentReports, setRecentReports] = useState<Pengaduan[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const fetchData = async () => {
    if (!user) return;
    try {
      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profileData) setProfile(profileData);

      // 2. Fetch Reports & Stats
      // Fetch without join first to avoid PGRST200 if FK is missing
      const { data: reportsData, error: reportsError } = await supabase
        .from("pengaduan")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (reportsError) throw reportsError;

      // Fetch categories for manual join
      const { data: categories } = await supabase
        .from("kategori_pengaduan")
        .select("id, nama");

      // Manual join
      const data = reportsData.map((item) => {
        const category = categories?.find((c) => c.id === item.kategori_id);
        return {
          ...item,
          kategori: category ? { nama: category.nama } : null,
        };
      });

      const total = data.length;
      const pending = data.filter((item) => item.status === "pending").length;
      const completed = data.filter(
        (item) => item.status === "completed",
      ).length;
      const process = data.filter((item) =>
        ["assigned", "in_progress"].includes(item.status),
      ).length;

      setStats({ total, pending, completed, process });
      setRecentReports(data.slice(0, 3) as any); // Ambil 3 terbaru
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [user]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#F1C40F";
      case "verified":
        return "#3498DB";
      case "assigned":
        return "#3498DB";
      case "in_progress":
        return "#3498DB";
      case "completed":
        return "#2ECC71";
      case "rejected":
        return "#E74C3C";
      default:
        return Colors.textLight;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Menunggu";
      case "assigned":
        return "Diproses";
      case "in_progress":
        return "Dikerjakan";
      case "completed":
        return "Selesai";
      case "rejected":
        return "Ditolak";
      default:
        return status;
    }
  };

  const renderStatCard = (
    label: string,
    count: number,
    icon: any,
    color: string,
  ) => (
    <View style={styles.statCard}>
      <View style={[styles.iconBg, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View>
        <Text style={styles.statCount}>{count}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section with Blue Background */}
        <View style={styles.headerBg}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </Text>
              <Text style={styles.greeting}>
                Halo, {profile?.full_name?.split(" ")[0] || "Warga"}!
              </Text>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => router.push("/(masyarakat)/profile")}
            >
              <Image
                source={{
                  uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    profile?.full_name || "User",
                  )}&background=${stringToColor(
                    profile?.full_name || "User",
                  )}&color=fff`,
                }}
                style={styles.avatar}
              />
            </TouchableOpacity>
          </View>

          {/* Main CTA Card - Overlapping Header */}
          <TouchableOpacity
            style={styles.ctaCard}
            onPress={() => router.push("/(masyarakat)/lapor")}
          >
            <View style={styles.ctaTextContainer}>
              <Text style={styles.ctaTitle}>Ada keluhan lingkungan?</Text>
              <Text style={styles.ctaSubtitle}>
                Laporkan segera, kami siap membantu.
              </Text>
              <View style={styles.ctaButton}>
                <Text style={styles.ctaButtonText}>Buat Laporan Baru</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </View>
            </View>
            <Image
              source={{
                uri: "https://img.freepik.com/free-vector/city-skyline-concept-illustration_114360-8923.jpg",
              }}
              style={styles.ctaImage}
            />
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Ringkasan Laporan</Text>
          <View style={styles.statsGrid}>
            {renderStatCard("Total", stats.total, "documents", Colors.primary)}
            {renderStatCard("Proses", stats.process, "time", "#3498DB")}
          </View>
          <View style={[styles.statsGrid, { marginTop: 12 }]}>
            {renderStatCard(
              "Selesai",
              stats.completed,
              "checkmark-circle",
              "#2ECC71",
            )}
            {renderStatCard(
              "Pending",
              stats.pending,
              "alert-circle",
              "#F1C40F",
            )}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Aktivitas Terbaru</Text>
            <TouchableOpacity
              onPress={() => router.push("/(masyarakat)/riwayat")}
            >
              <Text style={styles.seeAllText}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          {recentReports.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Belum ada laporan</Text>
            </View>
          ) : (
            recentReports.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.recentItem}
                onPress={() => router.push("/(masyarakat)/riwayat")}
              >
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: getStatusColor(item.status) },
                  ]}
                />
                <View style={styles.recentContent}>
                  <Text style={styles.recentTitle} numberOfLines={1}>
                    {item.judul}
                  </Text>
                  <Text style={styles.recentCategory}>
                    {item.kategori?.nama} •{" "}
                    {new Date(item.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(item.status) + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(item.status) },
                    ]}
                  >
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  headerBg: {
    backgroundColor: Colors.primary,
    paddingTop: 60, // Safe area top padding approx
    paddingHorizontal: 20,
    paddingBottom: 80, // Space for CTA card overlap
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  dateText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  greeting: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  profileButton: {
    padding: 2,
    backgroundColor: "#fff",
    borderRadius: 25,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  ctaCard: {
    position: "absolute",
    bottom: -60, // Overlap effect
    left: 20,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    overflow: "hidden",
  },
  ctaTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  ctaSubtitle: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 12,
  },
  ctaButton: {
    backgroundColor: Colors.text, // Dark button for contrast
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ctaButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  ctaImage: {
    width: 80,
    height: 80,
    opacity: 0.8,
  },
  sectionContainer: {
    marginTop: 70, // Compensate for CTA card overlap (60 overlap + 10 margin)
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBg: {
    padding: 10,
    borderRadius: 12,
  },
  statCount: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10, // Adjust for second section
    marginBottom: 16,
  },
  seeAllText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  emptyText: {
    color: Colors.textLight,
    marginTop: 8,
  },
  recentItem: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statusIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  recentContent: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  recentCategory: {
    fontSize: 12,
    color: Colors.textLight,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
  },
});
