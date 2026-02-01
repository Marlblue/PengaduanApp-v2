import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { useFocusEffect, useRouter } from "expo-router";
import { shareAsync } from "expo-sharing";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { supabase } from "../../lib/supabase";
import { Database } from "../../types/database.types";

type Pengaduan = Database["public"]["Tables"]["pengaduan"]["Row"] & {
  kategori: { nama: string } | null;
  pelapor: { full_name: string } | null;
};

const STATUS_FILTERS = [
  { value: "all", label: "Semua" },
  { value: "pending", label: "Pending" },
  { value: "process", label: "Proses" }, // assigned + in_progress
  { value: "completed", label: "Selesai" },
  { value: "rejected", label: "Ditolak" },
];

export default function AdminReports() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("all");
  const [reports, setReports] = useState<Pengaduan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredReports = reports.filter((item) => {
    return (
      item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.alamat &&
        item.alamat.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.pelapor?.full_name &&
        item.pelapor.full_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()))
    );
  });

  const fetchReports = async () => {
    try {
      // Fix: Fetch without join for category to avoid PGRST200
      // We keep pelapor join for now, assuming the named FK exists.
      let query = supabase
        .from("pengaduan")
        .select(
          `
          *,
          pelapor:profiles!pengaduan_user_id_fkey(full_name)
        `,
        )
        .order("created_at", { ascending: false });

      if (activeFilter !== "all") {
        if (activeFilter === "process") {
          query = query.in("status", ["assigned", "in_progress"]);
        } else {
          query = query.eq("status", activeFilter);
        }
      }

      const { data: reportsData, error: reportsError } = await query;

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
    }, [activeFilter]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const handleExportPDF = async () => {
    if (reports.length === 0) {
      Alert.alert("Info", "Tidak ada data untuk diekspor");
      return;
    }

    setExporting(true);
    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 20px; }
              h1 { text-align: center; color: #2C3E50; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; color: #333; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; color: white; display: inline-block; }
            </style>
          </head>
          <body>
            <h1>Laporan Pengaduan Masyarakat</h1>
            <p>Filter: ${STATUS_FILTERS.find((f) => f.value === activeFilter)?.label}</p>
            <p>Tanggal Ekspor: ${new Date().toLocaleDateString("id-ID")}</p>
            
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Judul</th>
                  <th>Kategori</th>
                  <th>Pelapor</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                </tr>
              </thead>
              <tbody>
                ${filteredReports
                  .map(
                    (item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.judul}</td>
                    <td>${item.kategori?.nama || "-"}</td>
                    <td>${item.pelapor?.full_name || "Anonim"}</td>
                    <td>${getStatusLabel(item.status)}</td>
                    <td>${new Date(item.created_at).toLocaleDateString("id-ID")}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
    } catch (error) {
      Alert.alert("Error", "Gagal mengekspor PDF");
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#F1C40F";
      case "assigned":
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
        return "Ditugaskan";
      case "in_progress":
        return "Diproses";
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
      onPress={() => router.push(`/(admin)/verifikasi/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + "20" },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {getStatusLabel(item.status).toUpperCase()}
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
      <Text style={styles.subtitle}>
        {item.kategori?.nama} • {item.pelapor?.full_name || "Anonim"}
      </Text>

      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={14} color={Colors.textLight} />
        <Text style={styles.locationText} numberOfLines={1}>
          {item.alamat || "Lokasi tidak tersedia"}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.actionText}>Lihat Detail</Text>
        <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={styles.headerTitle}>Semua Laporan</Text>
          <TouchableOpacity onPress={handleExportPDF} disabled={exporting}>
            {exporting ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="print-outline" size={24} color={Colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Bar */}
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
            placeholder="Cari laporan, pelapor, atau lokasi..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <FilterChips
          options={STATUS_FILTERS}
          selected={activeFilter}
          onSelect={(val) => {
            setLoading(true);
            setActiveFilter(val);
          }}
        />
      </View>

      {loading && !refreshing ? (
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
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
              <Ionicons name="search" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Tidak ada laporan</Text>
              <Text style={styles.emptySubText}>
                Belum ada data yang sesuai dengan filter ini.
              </Text>
            </View>
          }
        />
      )}
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
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
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
    marginHorizontal: 16,
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
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    color: Colors.text,
    fontSize: 14,
  },
  filterTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
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
  date: {
    fontSize: 12,
    color: Colors.textLight,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: Colors.textLight,
    flex: 1,
  },
  cardFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  actionText: {
    color: Colors.primary,
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
  },
});
