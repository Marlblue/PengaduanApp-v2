import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "../../../constants/Colors";
import { supabase } from "../../../lib/supabase";
import { Database } from "../../../types/database.types";

type Pengaduan = Database["public"]["Tables"]["pengaduan"]["Row"] & {
  kategori: { nama: string } | null;
  petugas: { full_name: string } | null;
};

export default function MasyarakatDetailLaporan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [report, setReport] = useState<Pengaduan | null>(null);
  const [loading, setLoading] = useState(true);

  // Rating State
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchReportDetail();
    }, [id]),
  );

  const fetchReportDetail = async () => {
    setLoading(true);
    try {
      // Fetch pengaduan + kategori + info petugas (jika ada)
      // Fix: Fetch without join for category to avoid PGRST200
      const { data: reportData, error: reportError } = await supabase
        .from("pengaduan")
        .select(
          `
          *,
          rating,
          ulasan,
          petugas:profiles!pengaduan_petugas_id_fkey(full_name)
        `,
        )
        .eq("id", id)
        .single();

      if (reportError) throw reportError;

      // Fetch category manually
      let categoryData = null;
      if (reportData.kategori_id) {
        const { data: cat } = await supabase
          .from("kategori_pengaduan")
          .select("nama")
          .eq("id", reportData.kategori_id)
          .single();
        categoryData = cat;
      }

      const data = {
        ...reportData,
        kategori: categoryData,
      };

      setReport(data as any);
      if (data.rating) setRating(data.rating);
      if (data.ulasan) setReview(data.ulasan);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal memuat detail laporan");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Menunggu Verifikasi";
      case "verified":
        return "Terverifikasi";
      case "assigned":
        return "Diproses Petugas";
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#F1C40F";
      case "verified":
        return "#3498DB";
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

  const submitRating = async () => {
    if (rating === 0) {
      Alert.alert("Peringatan", "Mohon berikan bintang (1-5)");
      return;
    }

    setSubmittingReview(true);
    try {
      const { data, error } = await supabase
        .from("pengaduan")
        .update({ rating, ulasan: review })
        .eq("id", id)
        .select(); // Remove .single() to avoid error on 0 rows

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error(
          "Gagal menyimpan rating. Pastikan laporan sudah selesai.",
        );
      }

      const updatedReport = data[0];

      // Update local state immediately
      setReport((prev) =>
        prev
          ? {
              ...prev,
              rating: updatedReport.rating,
              ulasan: updatedReport.ulasan,
            }
          : null,
      );

      Alert.alert("Terima Kasih", "Ulasan Anda telah dikirim.");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Laporan tidak ditemukan</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(report.status) },
            ]}
          >
            {getStatusLabel(report.status)}
          </Text>
          <Text style={styles.date}>
            {new Date(report.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <Text style={styles.title}>{report.judul}</Text>
        <Text style={styles.category}>{report.kategori?.nama || "Umum"}</Text>
      </View>

      {/* Konten Laporan */}
      <View style={styles.section}>
        <View style={styles.row}>
          <Ionicons name="location" size={16} color={Colors.textLight} />
          <Text style={styles.address}>
            {report.alamat || "Lokasi tidak tersedia"}
          </Text>
        </View>

        <Text style={styles.description}>{report.deskripsi}</Text>

        {report.foto_url && (
          <Image source={{ uri: report.foto_url }} style={styles.image} />
        )}
      </View>

      {/* Info Petugas (Jika ada) */}
      {report.petugas && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ditangani Oleh</Text>
          <View style={styles.row}>
            <Ionicons name="person-circle" size={24} color={Colors.primary} />
            <Text style={styles.infoText}>{report.petugas.full_name}</Text>
          </View>
        </View>
      )}

      {/* Hasil Tindak Lanjut (Jika Selesai/Ditolak) */}
      {(report.status === "completed" || report.status === "rejected") && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {report.status === "completed"
              ? "Laporan Penyelesaian"
              : "Alasan Penolakan"}
          </Text>

          <View style={styles.resultBox}>
            <Text style={styles.resultLabel}>Catatan:</Text>
            <Text style={styles.resultText}>
              {report.catatan_petugas ||
                report.tanggapan ||
                "Tidak ada catatan."}
            </Text>
          </View>

          {report.foto_penanganan_url && (
            <View>
              <Text style={styles.resultLabel}>Foto Bukti:</Text>
              <Image
                source={{ uri: report.foto_penanganan_url }}
                style={styles.resultImage}
              />
            </View>
          )}

          {report.status === "completed" && (
            <View style={styles.completedBadge}>
              <Ionicons
                name="checkmark-done-circle"
                size={24}
                color={Colors.primary}
              />
              <Text style={styles.completedText}>Laporan Selesai</Text>
            </View>
          )}
        </View>
      )}

      {/* Form Rating (Hanya jika Selesai) */}
      {report.status === "completed" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Berikan Ulasan</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingLabel}>Rating:</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  disabled={!!report.rating} // Disable jika sudah pernah rating (opsional, sesuaikan kebutuhan)
                >
                  <Ionicons
                    name={star <= rating ? "star" : "star-outline"}
                    size={32}
                    color="#F1C40F"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.ratingLabel}>Komentar:</Text>
          <TextInput
            style={styles.inputReview}
            placeholder="Tulis ulasan Anda..."
            value={review}
            onChangeText={setReview}
            multiline
            editable={!report.rating} // Disable jika sudah submit (opsional)
          />

          {!report.rating && (
            <TouchableOpacity
              style={styles.submitButton}
              onPress={submitRating}
              disabled={submittingReview}
            >
              {submittingReview ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Kirim Ulasan</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    color: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: "bold",
  },
  date: {
    color: Colors.textLight,
    fontSize: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  category: {
    color: Colors.primary,
    fontWeight: "bold",
    fontSize: 14,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  address: {
    color: Colors.textLight,
    flex: 1,
  },
  description: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
    color: Colors.text,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 16,
    backgroundColor: "#f0f0f0",
  },
  infoText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: "500",
  },
  resultBox: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  resultText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  resultImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: "#f0f0f0",
  },
  completedBadge: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#e6f7ff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  completedText: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary,
  },
  ratingContainer: {
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
    fontWeight: "600",
  },
  starsRow: {
    flexDirection: "row",
    gap: 8,
  },
  inputReview: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
