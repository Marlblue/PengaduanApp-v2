import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { FilterChips } from "../../components/FilterChips";
import { Colors } from "../../constants/Colors";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { Database } from "../../types/database.types";

type Pengaduan = Database["public"]["Tables"]["pengaduan"]["Row"] & {
  kategori: { nama: string } | null;
};

export default function PetugasDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Pengaduan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filterOptions = [
    { label: "Semua", value: "all" },
    { label: "Tugas Baru", value: "assigned" },
    { label: "Sedang Dikerjakan", value: "in_progress" },
  ];

  const filteredTasks = tasks.filter((item) => {
    const matchesSearch =
      item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.alamat &&
        item.alamat.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus =
      filterStatus === "all" || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const fetchTasks = async () => {
    if (!user) return;
    try {
      // Fix: Fetch without join for category to avoid PGRST200
      const { data: reportsData, error: reportsError } = await supabase
        .from("pengaduan")
        .select("*")
        .eq("petugas_id", user.id)
        .in("status", ["assigned", "in_progress"])
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
      fetchTasks();
    }, [user]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const renderItem = ({ item }: { item: Pengaduan }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: `/(petugas)/detail/${item.id}`,
          params: { headerTitle: "Tugas Saya" },
        })
      }
    >
      <View style={styles.cardHeader}>
        <View style={styles.statusBadgeContainer}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  item.status === "in_progress" ? "#E67E22" : "#3498DB",
              },
            ]}
          />
          <Text style={styles.statusText}>
            {item.status === "in_progress" ? "SEDANG DIKERJAKAN" : "TUGAS BARU"}
          </Text>
        </View>
        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Halo, Petugas!</Text>
        <Text style={styles.headerSubtitle}>
          Anda memiliki {tasks.length} tugas aktif.
        </Text>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#666"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari tugas..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <FilterChips
          options={filterOptions}
          selected={filterStatus}
          onSelect={setFilterStatus}
        />
      </View>

      <FlatList
        data={filteredTasks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Tidak ada tugas aktif</Text>
            <Text style={styles.emptySubText}>
              Semua tugas telah diselesaikan atau belum ada tugas baru.
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
  header: {
    padding: 20,
    backgroundColor: Colors.secondary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#f0f0f0",
    marginTop: 4,
  },
  filterContainer: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: "100%",
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
  statusBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F3F4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    color: Colors.text,
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
});
