import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaWrapper } from "../../../components/SafeAreaWrapper";
import { Colors } from "../../../constants/Colors";
import { useAuth } from "../../../hooks/useAuth";
import { supabase } from "../../../lib/supabase";
import { formatDate, getStatusColor, getStatusText } from "../../../lib/utils";
import { Pengaduan, PengaduanStatus } from "../../../types/database.types";

export default function PengaduanListScreen() {
  const { user } = useAuth();
  const [pengaduan, setPengaduan] = useState<Pengaduan[]>([]);
  const [filteredPengaduan, setFilteredPengaduan] = useState<Pengaduan[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<PengaduanStatus | "all">(
    "all"
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPengaduan = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from("pengaduan")
        .select(
          `
          *,
          profiles:user_id(full_name, email)
        `
        )
        .order("created_at", { ascending: false });

      // Filter berdasarkan role
      if (user.role === "masyarakat") {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setPengaduan(data || []);
      applyFilter(data || [], selectedStatus);
    } catch (error) {
      console.error("Error fetching pengaduan:", error);
      Alert.alert("Error", "Gagal memuat data pengaduan");
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (data: Pengaduan[], status: PengaduanStatus | "all") => {
    if (status === "all") {
      setFilteredPengaduan(data);
    } else {
      setFilteredPengaduan(data.filter((item) => item.status === status));
    }
  };

  useEffect(() => {
    fetchPengaduan();
  }, [user]);

  useEffect(() => {
    applyFilter(pengaduan, selectedStatus);
  }, [selectedStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPengaduan();
    setRefreshing(false);
  };

  const statusFilters: { value: PengaduanStatus | "all"; label: string }[] = [
    { value: "all", label: "Semua" },
    { value: "pending", label: "Menunggu" },
    { value: "diproses", label: "Diproses" },
    { value: "selesai", label: "Selesai" },
    { value: "ditolak", label: "Ditolak" },
  ];

  if (loading) {
    return (
      <SafeAreaWrapper>
        <View style={styles.centerContainer}>
          <Text>Memuat data...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Daftar Pengaduan</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push("/pengaduan/create")}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Buat Baru</Text>
          </TouchableOpacity>
        </View>

        {/* Status Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {statusFilters.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterButton,
                selectedStatus === filter.value && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedStatus(filter.value)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === filter.value && styles.filterTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          style={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredPengaduan.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="document-text-outline"
                size={64}
                color={Colors.textLight}
              />
              <Text style={styles.emptyText}>
                {selectedStatus === "all"
                  ? "Belum ada pengaduan"
                  : `Tidak ada pengaduan dengan status ${getStatusText(
                      selectedStatus
                    ).toLowerCase()}`}
              </Text>
            </View>
          ) : (
            filteredPengaduan.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => router.push(`/pengaduan/${item.id}`)}
              >
                {item.foto_url && (
                  <Image
                    source={{ uri: item.foto_url }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.judul}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(item.status) },
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {getStatusText(item.status)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardCategory}>{item.kategori}</Text>

                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {item.deskripsi}
                  </Text>

                  <View style={styles.cardFooter}>
                    <Text style={styles.cardDate}>
                      {formatDate(item.created_at)}
                    </Text>
                    {user?.role !== "masyarakat" && (
                      <Text style={styles.cardUser}>
                        oleh {item.profiles?.full_name || item.profiles?.email}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.border,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    color: Colors.textLight,
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#fff",
  },
  listContainer: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    color: Colors.textLight,
    textAlign: "center",
    fontSize: 16,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: 160,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  cardCategory: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "500",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  cardUser: {
    fontSize: 12,
    color: Colors.textLight,
    fontStyle: "italic",
  },
});
