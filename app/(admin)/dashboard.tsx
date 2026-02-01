import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "../../constants/Colors";
import { supabase } from "../../lib/supabase";
import { Database } from "../../types/database.types";

type Pengaduan = Database["public"]["Tables"]["pengaduan"]["Row"] & {
  kategori: { nama: string } | null;
  pelapor: { full_name: string } | null;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    process: 0,
    completed: 0,
  });

  const [pendingReports, setPendingReports] = useState<Pengaduan[]>([]);

  const fetchData = async () => {
    try {
      // 1. Fetch Stats
      const { data: allReports, error: statsError } = await supabase
        .from("pengaduan")
        .select("status");

      if (statsError) throw statsError;

      const total = allReports.length;
      const pending = allReports.filter((r) => r.status === "pending").length;
      const process = allReports.filter((r) =>
        ["assigned", "in_progress"].includes(r.status),
      ).length;
      const completed = allReports.filter(
        (r) => r.status === "completed",
      ).length;

      setStats({ total, pending, process, completed });

      // 2. Fetch Pending Reports List
      // Fix: Fetch without join for category to avoid PGRST200
      const { data: listDataRaw, error: listError } = await supabase
        .from("pengaduan")
        .select(
          `
          *,
          pelapor:profiles!pengaduan_user_id_fkey(full_name)
        `,
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (listError) throw listError;

      // Fetch categories for manual join
      const { data: categories } = await supabase
        .from("kategori_pengaduan")
        .select("id, nama");

      // Manual join
      const listData = listDataRaw.map((item) => {
        const category = categories?.find((c) => c.id === item.kategori_id);
        return {
          ...item,
          kategori: category ? { nama: category.nama } : null,
        };
      });

      setPendingReports(listData as any);
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
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderStatCard = (
    title: string,
    count: number,
    color: string,
    icon: any,
  ) => (
    <View style={styles.statCard}>
      <View style={[styles.iconContainer, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View>
        <Text style={styles.statCount}>{count}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Pengaduan }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(admin)/verifikasi/${item.id}`)}
    >
      <View style={styles.cardLeft}>
        <View style={styles.iconCircle}>
          <Ionicons name="alert" size={20} color="#E74C3C" />
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.categoryText}>
            {item.kategori?.nama || "Umum"}
          </Text>
          <Text style={styles.date}>
            {new Date(item.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
            })}
          </Text>
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {item.judul}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {item.pelapor?.full_name || "Anonim"} •{" "}
          {item.alamat || "Lokasi tidak tersedia"}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Custom */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dashboard Admin</Text>
          <Text style={styles.headerSubtitle}>
            Pantau laporan masuk hari ini
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
        </View>
      </View>

      <FlatList
        data={pendingReports}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* Header Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.row}>
                {renderStatCard(
                  "Total Laporan",
                  stats.total,
                  "#34495E",
                  "file-tray-full",
                )}
                {renderStatCard(
                  "Perlu Verifikasi",
                  stats.pending,
                  "#E74C3C",
                  "alert-circle",
                )}
              </View>
              <View style={styles.row}>
                {renderStatCard(
                  "Dalam Proses",
                  stats.process,
                  "#3498DB",
                  "time",
                )}
                {renderStatCard(
                  "Selesai",
                  stats.completed,
                  "#2ECC71",
                  "checkmark-done-circle",
                )}
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Menunggu Verifikasi</Text>
              {pendingReports.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>
                    {pendingReports.length} Baru
                  </Text>
                </View>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/7486/7486744.png",
              }}
              style={{
                width: 100,
                height: 100,
                opacity: 0.5,
                marginBottom: 20,
              }}
            />
            <Text style={styles.emptyText}>Semua bersih!</Text>
            <Text style={styles.emptySubText}>
              Tidak ada laporan yang perlu diverifikasi saat ini.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
  },
  headerIcon: {
    backgroundColor: "#EFF6FF",
    padding: 10,
    borderRadius: 12,
  },
  headerContainer: {
    marginBottom: 10,
  },
  listContent: {
    padding: 20,
    paddingTop: 20,
  },
  statsContainer: {
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
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
  iconContainer: {
    padding: 10,
    borderRadius: 12,
  },
  statCount: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  statTitle: {
    fontSize: 12,
    color: Colors.textLight,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  countBadge: {
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    color: "#D32F2F",
    fontSize: 12,
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLeft: {
    justifyContent: "center",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFEBEE",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "bold",
    color: Colors.primary,
  },
  date: {
    fontSize: 12,
    color: Colors.textLight,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textLight,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 8,
    textAlign: "center",
    maxWidth: "80%",
  },
});
