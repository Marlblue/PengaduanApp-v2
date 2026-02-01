import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

import { Toast } from "../../components/Toast";
import { Colors } from "../../constants/Colors";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { supabase } from "../../lib/supabase";
import { Database } from "../../types/database.types";

type Kategori = Database["public"]["Tables"]["kategori_pengaduan"]["Row"];

// Fallback categories in case DB is empty or fetch fails
const DEFAULT_CATEGORIES: Kategori[] = [
  { id: 1, nama: "Infrastruktur (Jalan/Jembatan)", created_at: "" },
  { id: 2, nama: "Kebersihan & Sampah", created_at: "" },
  { id: 3, nama: "Keamanan & Ketertiban", created_at: "" },
  { id: 4, nama: "Pelayanan Publik", created_at: "" },
  { id: 5, nama: "Kesehatan", created_at: "" },
  { id: 6, nama: "Bencana Alam", created_at: "" },
  { id: 7, nama: "Lainnya", created_at: "" },
];

export default function MasyarakatLapor() {
  const router = useRouter();
  const { user } = useAuth();
  const { visible, message, type, showToast, hideToast } = useToast();

  const [categories, setCategories] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [image, setImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("kategori_pengaduan")
      .select("*")
      .order("nama");

    if (error) {
      console.error(error);
      // Fallback to hardcoded categories if fetch fails (e.g. RLS issue or offline)
      setCategories(DEFAULT_CATEGORIES);
    } else if (data && data.length > 0) {
      setCategories(data);
    } else {
      // Fallback if table is empty
      setCategories(DEFAULT_CATEGORIES);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      showToast("Izin kamera diperlukan!", "warning");
      return;
    }

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

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showToast("Izin lokasi ditolak", "error");
        setLoading(false);
        return;
      }

      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert(
          "Lokasi Tidak Aktif",
          "Mohon aktifkan GPS/Lokasi pada perangkat Anda untuk menggunakan fitur ini.",
          [{ text: "OK" }],
        );
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });

      // Reverse geocoding to get address
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (reverseGeocode.length > 0) {
          const addr = reverseGeocode[0];
          const fullAddress = `${addr.street || ""} ${addr.name || ""}, ${
            addr.city || ""
          }, ${addr.region || ""}`;
          setAddress(fullAddress.trim());
        }
      } catch (e) {
        console.log("Error reverse geocoding", e);
      }
    } catch (error) {
      console.log("Error getting location:", error);
      showToast("Gagal mengambil lokasi. Coba lagi nanti.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title || !description || !selectedCategory) {
      showToast("Mohon lengkapi Judul, Kategori, dan Deskripsi", "warning");
      return;
    }

    if (!user) return;

    setUploading(true);

    try {
      let imageUrl = null;

      // 1. Upload Image if exists
      if (imageBase64) {
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const { data, error: uploadError } = await supabase.storage
          .from("pengaduan-images") // Pastikan bucket ini ada
          .upload(fileName, decode(imageBase64), {
            contentType: "image/jpeg",
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get Public URL
        const { data: publicUrlData } = supabase.storage
          .from("pengaduan-images")
          .getPublicUrl(fileName);

        imageUrl = publicUrlData.publicUrl;
      }

      // 2. Insert into Database
      const { error: insertError } = await supabase.from("pengaduan").insert({
        user_id: user.id,
        judul: title,
        deskripsi: description,
        kategori_id: selectedCategory,
        foto_url: imageUrl,
        latitude: location?.lat || null,
        longitude: location?.lng || null,
        alamat: address,
        status: "pending",
      });

      if (insertError) throw insertError;

      // Reset form state immediately
      setTitle("");
      setDescription("");
      setSelectedCategory(null);
      setAddress("");
      setLocation(null);
      setImage(null);
      setImageBase64(null);

      // Navigate immediately to history with success flag
      router.replace("/(masyarakat)/riwayat?created=true");
    } catch (error: any) {
      console.error(error);
      const errorMessage =
        error.message === "Network request failed"
          ? "Gagal terhubung ke server. Periksa koneksi internet Anda."
          : error.message || "Gagal mengirim laporan";
      showToast(errorMessage, "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Toast
        visible={visible}
        message={message}
        type={type}
        onHide={hideToast}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 80}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ padding: 20, paddingBottom: 150 }}
        >
          <Text style={styles.headerTitle}>Buat Laporan Baru</Text>

          {/* Judul */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Judul Laporan</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Jalan Berlubang di..."
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Kategori */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kategori</Text>
            <View style={styles.categoryContainer}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat.id && styles.categoryChipSelected,
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategory === cat.id &&
                        styles.categoryTextSelected,
                    ]}
                  >
                    {cat.nama}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Deskripsi */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Deskripsi Lengkap</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Jelaskan detail kejadian..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Lokasi */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Lokasi</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Alamat lokasi kejadian"
                value={address}
                onChangeText={setAddress}
              />
              <TouchableOpacity
                style={styles.iconButton}
                onPress={getCurrentLocation}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="location" size={24} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
            {location && (
              <Text style={styles.coords}>
                Koordinat: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </Text>
            )}
          </View>

          {/* Foto */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bukti Foto</Text>
            <View style={styles.imagePickerContainer}>
              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                <Ionicons name="image" size={24} color={Colors.primary} />
                <Text style={styles.imageButtonText}>Galeri</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                <Ionicons name="camera" size={24} color={Colors.primary} />
                <Text style={styles.imageButtonText}>Kamera</Text>
              </TouchableOpacity>
            </View>

            {image && (
              <View style={styles.previewContainer}>
                <Image source={{ uri: image }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImage}
                  onPress={() => {
                    setImage(null);
                    setImageBase64(null);
                  }}
                >
                  <Ionicons name="close-circle" size={24} color="#E74C3C" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, uploading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Kirim Laporan</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: Colors.text,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: Colors.text,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryText: {
    color: Colors.text,
  },
  categoryTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  iconButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  coords: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  imagePickerContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  imageButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    gap: 8,
  },
  imageButtonText: {
    color: Colors.primary,
    fontWeight: "600",
  },
  previewContainer: {
    position: "relative",
    marginTop: 10,
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    resizeMode: "cover",
  },
  removeImage: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 40,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
