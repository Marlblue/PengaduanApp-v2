import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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
  pelapor: { full_name: string; phone: string } | null;
};

export default function PetugasTaskDetail() {
  const { id, headerTitle } = useLocalSearchParams<{
    id: string;
    headerTitle?: string;
  }>();
  const router = useRouter();
  const navigation = useNavigation();

  const [task, setTask] = useState<Pengaduan | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Form Penyelesaian
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  useEffect(() => {
    if (headerTitle) {
      navigation.setOptions({ title: headerTitle });
    }
  }, [headerTitle]);

  useFocusEffect(
    useCallback(() => {
      fetchTaskDetail();
    }, [id]),
  );

  const fetchTaskDetail = async () => {
    setLoading(true);
    try {
      // Fix: Fetch without join for category to avoid PGRST200
      const { data: taskData, error: taskError } = await supabase
        .from("pengaduan")
        .select(
          `
          *,
          rating,
          ulasan,
          pelapor:profiles!pengaduan_user_id_fkey(full_name, phone)
        `,
        )
        .eq("id", id)
        .single();

      if (taskError) throw taskError;

      // Fetch category manually
      let categoryData = null;
      if (taskData.kategori_id) {
        const { data: cat } = await supabase
          .from("kategori_pengaduan")
          .select("nama")
          .eq("id", taskData.kategori_id)
          .single();
        categoryData = cat;
      }

      const data = {
        ...taskData,
        kategori: categoryData,
      };

      setTask(data as any);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal memuat detail tugas");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const openMaps = () => {
    if (!task?.latitude || !task?.longitude) {
      Alert.alert("Error", "Koordinat lokasi tidak tersedia");
      return;
    }

    const scheme = Platform.select({
      ios: "maps:0,0?q=",
      android: "geo:0,0?q=",
    });
    const latLng = `${task.latitude},${task.longitude}`;
    const label = "Lokasi Laporan";
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
    }
  };

  const handleStartTask = async () => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("pengaduan")
        .update({ status: "in_progress" })
        .eq("id", id);

      if (error) throw error;

      Alert.alert("Status Diperbarui", "Tugas sedang dikerjakan.");
      fetchTaskDetail(); // Refresh data
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!notes || !imageBase64) {
      Alert.alert(
        "Peringatan",
        "Mohon sertakan catatan dan foto bukti penanganan.",
      );
      return;
    }

    setProcessing(true);
    try {
      // 1. Upload Foto Penanganan
      const fileName = `penanganan/${id}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("pengaduan-images")
        .upload(fileName, decode(imageBase64), {
          contentType: "image/jpeg",
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("pengaduan-images")
        .getPublicUrl(fileName);

      // 2. Update Data
      const { error: updateError } = await supabase
        .from("pengaduan")
        .update({
          status: "completed",
          catatan_petugas: notes,
          foto_penanganan_url: publicUrlData.publicUrl,
        })
        .eq("id", id)
        .select();

      if (updateError) throw updateError;

      // Update state lokal agar UI langsung berubah
      setTask((prev) =>
        prev
          ? {
              ...prev,
              status: "completed",
              catatan_petugas: notes,
              foto_penanganan_url: publicUrlData.publicUrl,
            }
          : null,
      );

      Alert.alert("Sukses", "Tugas berhasil diselesaikan!", [
        { text: "OK", onPress: () => router.replace("/(petugas)/dashboard") },
      ]);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Gagal menyelesaikan tugas.");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "assigned":
        return "TUGAS BARU";
      case "in_progress":
        return "SEDANG DIKERJAKAN";
      case "completed":
        return "SELESAI";
      default:
        return status.toUpperCase();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned":
        return Colors.secondary;
      case "in_progress":
        return "#E67E22";
      case "completed":
        return "#2ECC71";
      default:
        return Colors.textLight;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  if (!task) return null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Unified Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(task.status) },
            ]}
          >
            {getStatusLabel(task.status)}
          </Text>
          <Text style={styles.date}>
            {new Date(task.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <Text style={styles.title}>{task.judul}</Text>
        <Text style={styles.category}>{task.kategori?.nama || "Umum"}</Text>
      </View>

      {/* Konten Laporan */}
      <View style={styles.section}>
        <View style={styles.row}>
          <Ionicons name="location" size={16} color={Colors.textLight} />
          <Text style={styles.address}>
            {task.alamat || "Lokasi tidak tersedia"}
          </Text>
        </View>

        {task.latitude && task.longitude && (
          <TouchableOpacity style={styles.mapButton} onPress={openMaps}>
            <Ionicons name="map" size={16} color="#fff" />
            <Text style={styles.mapButtonText}>Buka di Peta</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.description}>{task.deskripsi}</Text>

        {task.foto_url && (
          <Image source={{ uri: task.foto_url }} style={styles.image} />
        )}
      </View>

      {/* Pelapor Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Info Pelapor</Text>
        <View style={styles.row}>
          <Ionicons name="person" size={16} color={Colors.textLight} />
          <Text style={styles.infoText}>
            {task.pelapor?.full_name || "Anonim"}
          </Text>
        </View>
        {task.pelapor?.phone && (
          <View style={styles.row}>
            <Ionicons name="call" size={16} color={Colors.textLight} />
            <Text style={styles.infoText}>{task.pelapor.phone}</Text>
          </View>
        )}
      </View>

      {/* Ulasan Masyarakat (Jika Ada) */}
      {task.rating && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ulasan Pelapor</Text>
          <View style={styles.ratingBox}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= task.rating! ? "star" : "star-outline"}
                  size={24}
                  color="#F1C40F"
                />
              ))}
              <Text style={styles.ratingText}>({task.rating}/5)</Text>
            </View>
            {task.ulasan && (
              <Text style={styles.reviewText}>"{task.ulasan}"</Text>
            )}
          </View>
        </View>
      )}

      {/* Action Area */}
      <View style={styles.actionArea}>
        {task.status === "assigned" ? (
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartTask}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={styles.buttonText}>Mulai Kerjakan</Text>
              </>
            )}
          </TouchableOpacity>
        ) : task.status === "in_progress" ? (
          <View>
            <Text style={styles.sectionTitle}>Laporan Penyelesaian</Text>

            <Text style={styles.label}>Catatan Penanganan</Text>
            <TextInput
              style={styles.input}
              placeholder="Tuliskan tindakan yang dilakukan..."
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <Text style={styles.label}>Foto Bukti Selesai</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              {image ? (
                <Image source={{ uri: image }} style={styles.previewImage} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="camera" size={32} color={Colors.textLight} />
                  <Text style={{ color: Colors.textLight }}>Ambil Foto</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleCompleteTask}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Selesaikan Tugas</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Bukti Penyelesaian</Text>

            <Text style={styles.label}>Catatan Penanganan</Text>
            <View style={styles.readOnlyBox}>
              <Text style={styles.readOnlyText}>
                {task.catatan_petugas || "-"}
              </Text>
            </View>

            <Text style={styles.label}>Foto Bukti</Text>
            {task.foto_penanganan_url ? (
              <Image
                source={{ uri: task.foto_penanganan_url }}
                style={styles.evidenceImage}
              />
            ) : (
              <Text style={styles.readOnlyText}>Tidak ada foto</Text>
            )}

            <View style={styles.completedBadge}>
              <Ionicons
                name="checkmark-done-circle"
                size={24}
                color={Colors.primary}
              />
              <Text style={styles.completedText}>Tugas Selesai</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
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
    color: Colors.secondary,
    fontWeight: "bold",
    fontSize: 14,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  address: {
    flex: 1,
    marginLeft: 8,
    color: Colors.text,
    fontSize: 14,
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3498DB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 10,
    marginBottom: 10,
    gap: 6,
  },
  mapButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
    color: Colors.text,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 16,
    backgroundColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: Colors.text,
  },
  actionArea: {
    padding: 20,
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: Colors.secondary,
    padding: 16,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  completeButton: {
    backgroundColor: "#2ECC71",
    padding: 16,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: Colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  uploadButton: {
    height: 150,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  uploadPlaceholder: {
    alignItems: "center",
    gap: 8,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  evidenceImage: {
    width: "100%",
    height: 250,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: "#f0f0f0",
  },
  readOnlyBox: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 16,
  },
  readOnlyText: {
    fontSize: 15,
    color: Colors.text,
  },
  completedBadge: {
    marginTop: 30,
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
