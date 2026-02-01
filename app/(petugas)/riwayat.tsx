import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "../../constants/Colors";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { Database } from "../../types/database.types";

type Pengaduan = Database["public"]["Tables"]["pengaduan"]["Row"] & {
  kategori: { nama: string } | null;
};

export default function PetugasRiwayat() {
  const router = useRouter();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Pengaduan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    if (!user) return;
    try {
      // Fix: Fetch without join for category to avoid PGRST200
      const { data: reportsData, error: reportsError } = await supabase
        .from("pengaduan")
        .select("*")
        .eq("petugas_id", user.id)
        .eq("status", "completed")
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

      setTasks(data as any);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [user]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const renderItem = ({ item }: { item: Pengaduan }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: `/(petugas)/detail/${item.id}`,
          params: { headerTitle: "Selesai" },
        })
      }
    >
      <View style={styles.cardHeader}>
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#fff" />
          <Text style={styles.statusText}>SELESAI</Text>
        </View>
        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
          })}
        </Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {item.judul}
      </Text>
      <Text style={styles.category}>{item.kategori?.nama || "Umum"}</Text>

      <View style={styles.locationContainer}>
        <Ionicons name="location-outline" size={16} color={Colors.textLight} />
        <Text style={styles.locationText} numberOfLines={1}>
          {item.alamat || "Lokasi tidak tersedia"}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.detailLink}>Lihat Detail</Text>
        <Ionicons name="arrow-forward" size={14} color={Colors.secondary} />
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Belum ada riwayat</Text>
            <Text style={styles.emptySubText}>
              Tugas yang Anda selesaikan akan muncul di sini.
            </Text>
          </View>
        }
      />
    </View>
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
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2ECC71",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
  },
  date: {
    fontSize: 12,
    color: Colors.textLight,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  category: {
    fontSize: 12,
    color: Colors.secondary,
    marginBottom: 12,
    fontWeight: "600",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
    color: Colors.textLight,
    marginLeft: 6,
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
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
    paddingHorizontal: 40,
  },
  footer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  detailLink: {
    color: Colors.secondary,
    fontWeight: "bold",
    fontSize: 14,
    marginRight: 4,
  },
});
