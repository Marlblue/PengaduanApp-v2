import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
  pelapor: { full_name: string; phone: string; email: string } | null;
};

type Petugas = {
  id: string;
  full_name: string;
};

export default function AdminVerification() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [report, setReport] = useState<Pengaduan | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Modal Controls
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);

  // Data for Actions
  const [rejectReason, setRejectReason] = useState("");
  const [petugasList, setPetugasList] = useState<Petugas[]>([]);
  const [selectedPetugas, setSelectedPetugas] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [id]),
  );

  const fetchDetail = async () => {
    setLoading(true);
    try {
      // Fix: Fetch without join for category to avoid PGRST200
      const { data: reportData, error: reportError } = await supabase
        .from("pengaduan")
        .select(
          `
          *,
          rating,
          ulasan,
          pelapor:profiles!pengaduan_user_id_fkey(full_name, phone, email)
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
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal memuat detail laporan");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchPetugas = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "petugas");

      if (error) throw error;
      setPetugasList(data);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal memuat daftar petugas");
    }
  };

  const openAssignModal = () => {
    fetchPetugas();
    setAssignModalVisible(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert("Peringatan", "Mohon isi alasan penolakan");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("pengaduan")
        .update({
          status: "rejected",
          tanggapan: rejectReason,
        })
        .eq("id", id);

      if (error) throw error;

      Alert.alert("Sukses", "Laporan telah ditolak.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setProcessing(false);
      setRejectModalVisible(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedPetugas) {
      Alert.alert("Peringatan", "Pilih petugas terlebih dahulu");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("pengaduan")
        .update({
          status: "assigned",
          petugas_id: selectedPetugas,
        })
        .eq("id", id);

      if (error) throw error;

      Alert.alert("Sukses", "Laporan diverifikasi dan ditugaskan.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setProcessing(false);
      setAssignModalVisible(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!report) return null;

  // Helper untuk status banner
  const getStatusBanner = () => {
    switch (report.status) {
      case "pending":
        return {
          text: "MENUNGGU VERIFIKASI",
          color: "#F1C40F",
          textColor: "#856404",
        };
      case "assigned":
      case "in_progress":
        return { text: "SEDANG DIPROSES", color: "#3498DB", textColor: "#fff" };
      case "completed":
        return { text: "SELESAI", color: "#2ECC71", textColor: "#fff" };
      case "rejected":
        return { text: "DITOLAK", color: "#E74C3C", textColor: "#fff" };
      default:
        return { text: "UNKNOWN", color: "#95A5A6", textColor: "#fff" };
    }
  };

  const banner = getStatusBanner();

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Status Banner */}
        <View style={[styles.headerBanner, { backgroundColor: banner.color }]}>
          <Text style={[styles.bannerText, { color: banner.textColor }]}>
            {banner.text}
          </Text>
        </View>

        <View
          style={[
            styles.content,
            report.status === "pending" && { paddingBottom: 120 },
          ]}
        >
          <Text style={styles.date}>
            Dilaporkan pada:{" "}
            {new Date(report.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>

          <Text style={styles.title}>{report.judul}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {report.kategori?.nama || "Umum"}
            </Text>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <View style={styles.row}>
              <Ionicons name="location" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Lokasi Kejadian</Text>
            </View>
            <Text style={styles.sectionContent}>
              {report.alamat || "Koordinat GPS Saja"}
            </Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <View style={styles.row}>
              <Ionicons name="document-text" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Deskripsi</Text>
            </View>
            <Text style={styles.descriptionText}>{report.deskripsi}</Text>
          </View>

          {/* Image */}
          {report.foto_url && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Foto Bukti</Text>
              <Image
                source={{ uri: report.foto_url }}
                style={styles.evidenceImage}
              />
            </View>
          )}

          {/* Penanganan Info (For Completed/In Progress) */}
          {["assigned", "in_progress", "completed"].includes(report.status) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Info Penanganan</Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Petugas:</Text>
                <Text style={styles.infoValue}>
                  {/* Note: We need to fetch petugas name if not joined. 
                        For now, showing ID or we should join it in query. 
                        Let's update query below to join petugas details 
                    */}
                  Petugas ID: {report.petugas_id}
                </Text>
              </View>

              {report.status === "completed" && (
                <>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Catatan:</Text>
                    <Text style={styles.infoValue}>
                      {report.catatan_petugas}
                    </Text>
                  </View>
                  {report.foto_penanganan_url && (
                    <Image
                      source={{ uri: report.foto_penanganan_url }}
                      style={styles.evidenceImage}
                    />
                  )}
                </>
              )}
            </View>
          )}

          {/* Ulasan Masyarakat (Jika Ada) */}
          {report.rating && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ulasan Pelapor</Text>
              <View style={styles.ratingBox}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= report.rating! ? "star" : "star-outline"}
                      size={24}
                      color="#F1C40F"
                    />
                  ))}
                  <Text style={styles.ratingText}>({report.rating}/5)</Text>
                </View>
                {report.ulasan && (
                  <Text style={styles.reviewText}>"{report.ulasan}"</Text>
                )}
              </View>
            </View>
          )}

          {/* Rejected Info */}
          {report.status === "rejected" && (
            <View
              style={[
                styles.section,
                { backgroundColor: "#FDEDEC", padding: 10, borderRadius: 8 },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: "#E74C3C" }]}>
                Alasan Penolakan
              </Text>
              <Text style={{ color: "#C0392B" }}>{report.tanggapan}</Text>
            </View>
          )}

          {/* Reporter Info */}
          <View style={styles.reporterCard}>
            <Text style={styles.reporterTitle}>Info Pelapor</Text>
            <Text style={styles.reporterName}>
              {report.pelapor?.full_name || "Anonim"}
            </Text>
            <Text style={styles.reporterContact}>{report.pelapor?.email}</Text>
            <Text style={styles.reporterContact}>{report.pelapor?.phone}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons - Only for Pending */}
      {report.status === "pending" && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => setRejectModalVisible(true)}
          >
            <Text style={styles.rejectText}>Tolak</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.verifyButton}
            onPress={openAssignModal}
          >
            <Text style={styles.verifyText}>Verifikasi & Tugaskan</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal Tolak */}
      <Modal visible={rejectModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tolak Laporan</Text>
            <Text style={styles.modalSubtitle}>
              Berikan alasan penolakan untuk pelapor.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Contoh: Bukti kurang jelas, Lokasi salah, dll."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.modalBtnTextCancel}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnDanger}
                onPress={handleReject}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalBtnText}>Tolak Laporan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Assign */}
      <Modal visible={assignModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Petugas</Text>
            <Text style={styles.modalSubtitle}>
              Tugaskan laporan ini kepada:
            </Text>

            <ScrollView style={styles.petugasList}>
              {petugasList.map((petugas) => (
                <TouchableOpacity
                  key={petugas.id}
                  style={[
                    styles.petugasItem,
                    selectedPetugas === petugas.id &&
                      styles.petugasItemSelected,
                  ]}
                  onPress={() => setSelectedPetugas(petugas.id)}
                >
                  <Ionicons
                    name={
                      selectedPetugas === petugas.id
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={20}
                    color={
                      selectedPetugas === petugas.id ? Colors.primary : "#ccc"
                    }
                  />
                  <Text style={styles.petugasName}>{petugas.full_name}</Text>
                </TouchableOpacity>
              ))}
              {petugasList.length === 0 && (
                <Text
                  style={{ textAlign: "center", color: "#999", margin: 20 }}
                >
                  Tidak ada petugas tersedia.
                </Text>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setAssignModalVisible(false)}
              >
                <Text style={styles.modalBtnTextCancel}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnPrimary}
                onPress={handleAssign}
                disabled={processing || !selectedPetugas}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalBtnText}>Simpan & Tugaskan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerBanner: {
    backgroundColor: "#F1C40F",
    padding: 12,
    alignItems: "center",
  },
  bannerText: {
    color: "#856404",
    fontWeight: "bold",
    fontSize: 14,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  date: {
    color: Colors.textLight,
    fontSize: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F6F3",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 20,
  },
  categoryText: {
    color: Colors.secondary,
    fontWeight: "bold",
    fontSize: 12,
  },
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
  },
  sectionContent: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    marginLeft: 28,
  },
  descriptionText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  evidenceImage: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: "#f0f0f0",
  },
  reporterCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  reporterTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.textLight,
    marginBottom: 8,
  },
  reporterName: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
  },
  reporterContact: {
    fontSize: 14,
    color: Colors.textLight,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    flexDirection: "row",
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E74C3C",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  rejectText: {
    color: "#E74C3C",
    fontWeight: "bold",
  },
  verifyButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  verifyText: {
    color: "#fff",
    fontWeight: "bold",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 10,
  },
  modalBtnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalBtnTextCancel: {
    color: Colors.textLight,
    fontWeight: "bold",
  },
  modalBtnDanger: {
    backgroundColor: "#E74C3C",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalBtnPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  petugasList: {
    maxHeight: 200,
    marginBottom: 20,
  },
  petugasItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 12,
  },
  petugasItemSelected: {
    backgroundColor: "#F0F8FF",
  },
  petugasName: {
    fontSize: 16,
    color: Colors.text,
  },
  infoBox: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: "500",
  },
  ratingBox: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    marginLeft: 8,
  },
  reviewText: {
    fontStyle: "italic",
    color: Colors.text,
    lineHeight: 22,
  },
});
