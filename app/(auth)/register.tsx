import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Toast } from "../../components/Toast";
import { Colors } from "../../constants/Colors";
import { useToast } from "../../hooks/useToast";
import { supabase } from "../../lib/supabase";

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const { visible, message, type, showToast, hideToast } = useToast();

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleRegister = async () => {
    const { fullName, email, phone, password, confirmPassword } = form;

    if (!fullName || !email || !phone || !password || !confirmPassword) {
      showToast("Semua kolom wajib diisi", "error");
      return;
    }

    // Validate Full Name
    if (fullName.length < 3) {
      showToast("Nama lengkap minimal 3 karakter", "error");
      return;
    }

    const nameRegex = /^[a-zA-Z\s'.\-]+$/;
    if (!nameRegex.test(fullName)) {
      showToast(
        "Nama lengkap hanya boleh berisi huruf, spasi, titik, petik, dan strip",
        "error",
      );
      return;
    }

    // Validate Email Format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast("Format email tidak valid", "error");
      return;
    }

    // Validate Phone Number Format
    const phoneRegex = /^08[1-9][0-9]{7,11}$/;
    if (!phoneRegex.test(phone)) {
      showToast("Format nomor telepon tidak valid (Gunakan 08...)", "error");
      return;
    }

    if (password !== confirmPassword) {
      showToast("Password konfirmasi tidak sesuai", "error");
      return;
    }

    if (password.length < 6) {
      showToast("Password minimal 6 karakter", "error");
      return;
    }

    if (!agreed) {
      showToast("Anda wajib menyetujui Syarat & Ketentuan", "error");
      return;
    }

    setLoading(true);
    try {
      // 0. Pre-check: Cek apakah nomor HP sudah terdaftar di tabel profiles
      // Menggunakan maybeSingle() untuk menghindari error JSON jika kosong
      const { data: existingPhone, error: phoneCheckError } = await supabase
        .from("profiles")
        .select("phone")
        .eq("phone", phone)
        .maybeSingle();

      if (phoneCheckError) {
        // Abaikan error permission/RLS, lanjut ke sign up (biarkan backend handle)
        console.log(
          "Phone check skipped due to error:",
          phoneCheckError.message,
        );
      } else if (existingPhone) {
        throw new Error("Nomor telepon sudah terdaftar. Silakan login.");
      }

      // 1. Sign Up (Atomic: Includes metadata for Trigger)
      // Tentukan redirect URL berdasarkan environment
      const redirectTo = __DEV__
        ? undefined // Di Expo Go (Dev), biarkan default Supabase (Site URL) untuk menghindari broken scheme
        : "pengaduanappv2://(auth)/login"; // Di Production (APK), gunakan Deep Link scheme

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: fullName,
            phone: phone,
          },
        },
      });

      if (authError) throw authError;

      // 2. Success Handling
      if (authData.user) {
        if (authData.session) {
          // Auto Login (Jika Confirm Email dimatikan di Supabase)
          showToast("Registrasi berhasil! Masuk ke aplikasi...", "success");
          // Redirect akan ditangani otomatis oleh app/_layout.tsx yang mendeteksi user login
        } else {
          // Verify Flow (Jika Confirm Email menyala)
          showToast(
            "Link verifikasi telah dikirim ke email Anda.",
            "success",
          );
          // Redirect to Login
          setTimeout(() => {
            router.replace("/(auth)/login");
          }, 2500);
        }
      }
    } catch (error: any) {
      let errorMessage = error.message || "Gagal registrasi";

      // Map Supabase/Postgres errors to user-friendly messages
      if (errorMessage.includes("Database error saving new user")) {
        errorMessage =
          "Nomor telepon sudah terdaftar. Silakan gunakan nomor lain atau login.";
      } else if (errorMessage.includes("User already registered")) {
        errorMessage = "Email sudah terdaftar. Silakan login.";
      } else if (errorMessage.includes("rate limit")) {
        errorMessage = "Terlalu banyak percobaan. Coba lagi nanti.";
      } else if (errorMessage.includes("Password should be")) {
        errorMessage =
          "Password terlalu lemah. Gunakan kombinasi huruf dan angka.";
      }

      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Toast
        visible={visible}
        message={message}
        type={type}
        onHide={hideToast}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Buat Akun</Text>
              <Text style={styles.subtitle}>
                Bergabung untuk melapor lebih mudah
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nama Lengkap</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={Colors.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nama Lengkap"
                  placeholderTextColor="#94a3b8"
                  value={form.fullName}
                  onChangeText={(t) => handleChange("fullName", t)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={Colors.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="nama@email.com"
                  placeholderTextColor="#94a3b8"
                  value={form.email}
                  onChangeText={(t) => handleChange("email", t)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nomor Telepon</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={Colors.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="08xxxxxxxxxx"
                  placeholderTextColor="#94a3b8"
                  value={form.phone}
                  onChangeText={(t) => {
                    // Only allow numbers
                    if (/^\d*$/.test(t)) {
                      handleChange("phone", t);
                    }
                  }}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={Colors.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Minimal 6 karakter"
                  placeholderTextColor="#94a3b8"
                  value={form.password}
                  onChangeText={(t) => handleChange("password", t)}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={Colors.textLight}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Konfirmasi Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={Colors.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Ulangi password"
                  placeholderTextColor="#94a3b8"
                  value={form.confirmPassword}
                  onChangeText={(t) => handleChange("confirmPassword", t)}
                  secureTextEntry={!showConfirm}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                  <Ionicons
                    name={showConfirm ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={Colors.textLight}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setAgreed(!agreed)}
              >
                <Ionicons
                  name={agreed ? "checkbox" : "square-outline"}
                  size={24}
                  color={agreed ? Colors.primary : "#94a3b8"}
                />
              </TouchableOpacity>
              <Text style={styles.termsText}>
                Saya menyetujui{" "}
                <Text style={styles.termsLink}>Syarat & Ketentuan</Text> dan{" "}
                <Text style={styles.termsLink}>Kebijakan Privasi</Text> yang
                berlaku.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Daftar Sekarang</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Sudah punya akun? </Text>
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                setTimeout(() => {
                  router.replace("/(auth)/login");
                }, 100);
              }}
            >
              <Text style={styles.footerLink}>Masuk Disini</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    marginTop: 8,
  },
  checkbox: {
    marginRight: 8,
    marginTop: -2,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: "600",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 30,
    marginTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTextContainer: {
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e293b",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1e293b",
  },
  button: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "center",
    paddingBottom: 20,
  },
  footerText: {
    color: "#64748b",
    fontSize: 14,
  },
  footerLink: {
    color: Colors.primary,
    fontWeight: "bold",
    fontSize: 14,
  },
});
