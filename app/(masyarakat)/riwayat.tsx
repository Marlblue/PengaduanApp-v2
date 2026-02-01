import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { FilterChips } from "../../components/FilterChips";
import { Toast } from "../../components/Toast";
import { Colors } from "../../constants/Colors";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { supabase } from "../../lib/supabase";
import { Database } from "../../types/database.types";

type Pengaduan = Database["public"]["Tables"]["pengaduan"]["Row"] & {
  kategori: { nama: string } | null;
};

export default function MasyarakatRiwayat() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { visible, message, type, showToast, hideToast } = useToast();

  const [reports, setReports] = useState<Pengaduan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filterOptions = [
    { label: "Semua", value: "all" },
    { label: "Menunggu", value: "pending" },
    { label: "Diproses", value: "assigned" },
    { label: "Dikerjakan", value: "in_progress" },
    { label: "Selesai", value: "completed" },
    { label: "Ditolak", value: "rejected" },
  ];

  const filteredReports = reports.filter((item) => {
    const matchesSearch =
      item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.deskripsi.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const fetchReports = async () => {
    if (!user) return;
    try {
      // Fix: Fetch without join first to avoid PGRST200 if FK is missing
      const { data: reportsData, error: reportsError } = await supabase
        .from("pengaduan")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (reportsError) {
        throw reportsError;
      }

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

      // Supabase returns nested object for joined tables, but our type expects it.
      // We might need to cast or ensure the query matches the type.
      // The select query above returns kategori as an object { nama: ... } or null.
      setReports(data as any);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchReports();

      if (params.created === "true") {
        showToast("Laporan berhasil dikirim!", "success");
        router.setParams({ created: null });
      }
    }, [user, params.created]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#F1C40F";

      case "assigned":
        return "#9B59B6";
      case "in_progress":
        return "#E67E22";
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
        return "Sedang Dikerjakan";
      case "completed":
        return "Selesai";
      case "rejected":
        return "Ditolak";
      default:
        return status;
    }
  };

  const renderItem = ({ item }: { item: Pengaduan }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        router.push(`/(masyarakat)/detail/${item.id}`);
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.title}>{item.judul}</Text>

      {item.kategori?.nama && (
        <Text style={styles.category}>{item.kategori.nama}</Text>
      )}

      <Text style={styles.description} numberOfLines={2}>
        {item.deskripsi}
      </Text>

      {item.foto_url && (
        <Image source={{ uri: item.foto_url }} style={styles.thumbnail} />
      )}

      <View style={styles.footer}>
        <View style={styles.locationContainer}>
          <Ionicons
            name="location-outline"
            size={16}
            color={Colors.textLight}
          />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.alamat || "Lokasi tidak tersedia"}
          </Text>
        </View>
      </View>
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
      <Toast
        visible={visible}
        message={message}
        type={type}
        onHide={hideToast}
      />
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
            placeholder="Cari laporan..."
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
        data={filteredReports}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Belum ada laporan</Text>
            <Text style={styles.emptySubText}>
              Laporan yang Anda buat akan muncul di sini.
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
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: Colors.textLight,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  category: {
    fontSize: 12,
    color: Colors.primary,
    marginBottom: 8,
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    color: "#555",
    marginBottom: 12,
    lineHeight: 20,
  },
  thumbnail: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#f0f0f0",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  locationText: {
    fontSize: 12,
    color: Colors.textLight,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
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
  },
});
