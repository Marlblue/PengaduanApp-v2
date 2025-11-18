import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaWrapper } from "../../../components/SafeAreaWrapper";
import { Colors } from "../../../constants/Colors";
import { useAuth } from "../../../hooks/useAuth";
import { supabase } from "../../../lib/supabase";
import { getStatusColor, getStatusText } from "../../../lib/utils";
import {
  Aspirasi,
  AspirasiStatus,
  Profile,
} from "../../../types/database.types";

interface AspirasiWithDetails extends Aspirasi {
  profiles: Profile;
}

const STATUS_OPTIONS: { value: AspirasiStatus; label: string }[] = [
  { value: "pending", label: "Menunggu" },
  { value: "disetujui", label: "Disetujui" },
  { value: "ditolak", label: "Ditolak" },
];

export default function UpdateAspirasiScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [aspirasi, setAspirasi] = useState<AspirasiWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [form, setForm] = useState({
    status: "pending" as AspirasiStatus,
    tanggapan: "",
  });

  const fetchAspirasi = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("aspirasi")
        .select(
          `
          *,
          profiles:user_id(*)
        `
        )
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      setAspirasi(data);
      setForm({
        status: data.status,
        tanggapan: data.tanggapan || "",
      });
    } catch (error) {
      console.error("Error fetching aspirasi:", error);
      Alert.alert("Error", "Gagal memuat data aspirasi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchAspirasi();
    }
  }, [id]);

  const handleSubmit = async () => {
    if (!aspirasi) return;

    if (form.status !== "pending" && !form.tanggapan) {
      Alert.alert("Error", "Harap berikan tanggapan untuk status ini");
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("aspirasi")
        .update({
          status: form.status,
          tanggapan: form.tanggapan,
        })
        .eq("id", aspirasi.id);

      if (error) {
        throw error;
      }

      Alert.alert("Sukses", "Status aspirasi berhasil diperbarui", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Error updating aspirasi:", error);
      Alert.alert("Error", "Gagal memperbarui status aspirasi");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaWrapper>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaWrapper>
    );
  }

  if (!aspirasi) {
    return (
      <SafeAreaWrapper>
        <View style={styles.centerContainer}>
          <Text>Aspirasi tidak ditemukan</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Update Status Aspirasi</Text>
          <Text style={styles.subtitle}>
            Berikan tanggapan dan ubah status aspirasi
          </Text>
        </View>

        {/* Info Aspirasi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Aspirasi</Text>
          <Text style={styles.aspirasiTitle}>{aspirasi.judul}</Text>
          <Text style={styles.aspirasiCategory}>{aspirasi.kategori}</Text>
          <Text style={styles.aspirasiDescription}>{aspirasi.deskripsi}</Text>

          <View style={styles.pengajuInfo}>
            <Text style={styles.pengajuLabel}>Diajukan oleh:</Text>
            <Text style={styles.pengajuName}>
              {aspirasi.profiles?.full_name || aspirasi.profiles?.email}
            </Text>
          </View>

          <View style={styles.currentStatus}>
            <Text style={styles.currentStatusLabel}>Status Saat Ini:</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(aspirasi.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {getStatusText(aspirasi.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* Form Update */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Update Status</Text>

          {/* Status Options */}
          <View style={styles.statusOptions}>
            {STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.statusOption,
                  form.status === option.value && styles.statusOptionActive,
                ]}
                onPress={() =>
                  setForm((prev) => ({ ...prev, status: option.value }))
                }
              >
                <View
                  style={[
                    styles.statusOptionDot,
                    { backgroundColor: getStatusColor(option.value) },
                  ]}
                />
                <Text
                  style={[
                    styles.statusOptionText,
                    form.status === option.value &&
                      styles.statusOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tanggapan */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Tanggapan {form.status !== "pending" && "*"}
            </Text>
            <Text style={styles.helperText}>
              {form.status === "disetujui" &&
                "Berikan apresiasi dan penjelasan tentang aspirasi yang disetujui"}
              {form.status === "ditolak" &&
                "Berikan alasan penolakan aspirasi dengan sopan"}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tulis tanggapan Anda..."
              value={form.tanggapan}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, tanggapan: value }))
              }
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={updating}
          >
            <Text style={styles.cancelButtonText}>Batal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (updating || (form.status !== "pending" && !form.tanggapan)) &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={
              updating || (form.status !== "pending" && !form.tanggapan)
            }
          >
            {updating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Simpan Perubahan</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textLight,
  },
  section: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 12,
  },
  aspirasiTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  aspirasiCategory: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "500",
    marginBottom: 8,
  },
  aspirasiDescription: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  pengajuInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    padding: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
  },
  pengajuLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  pengajuName: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500",
  },
  currentStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currentStatusLabel: {
    fontSize: 14,
    color: Colors.textLight,
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
  statusOptions: {
    gap: 8,
    marginBottom: 20,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    gap: 12,
  },
  statusOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: "#f0f9ff",
  },
  statusOptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOptionText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500",
  },
  statusOptionTextActive: {
    color: Colors.primary,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  helperText: {
    fontSize: 14,
    color: Colors.textLight,
    fontStyle: "italic",
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  textArea: {
    minHeight: 100,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#fff",
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
