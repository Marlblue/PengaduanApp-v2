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
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { supabase } from "../../lib/supabase";

export default function LoginScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { visible, message, type, showToast, hideToast } = useToast();

  // Redirect if user is already logged in (e.g. from deep link confirmation)
  React.useEffect(() => {
    if (!authLoading && user) {
      if (user.role === "admin") {
        router.replace("/(admin)/dashboard");
      } else if (user.role === "petugas") {
        router.replace("/(petugas)/dashboard");
      } else {
        router.replace("/(masyarakat)/home");
      }
    }
  }, [user, authLoading]);

  const handleLogin = async () => {
    if (!email || !password) {
      showToast("Email dan password wajib diisi", "error");
      return;
    }

    setLoading(true);
    try {
      // Create a timeout promise that rejects after 15 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), 15000);
      });

      // Check if session already exists
      const {
        data: { session },
      } = await supabase.auth.getSession();

      let loginPromise;
      if (session?.user?.email === email.trim().toLowerCase()) {
        // If already logged in as same user, skip signIn
        loginPromise = Promise.resolve({
          data: { user: session.user },
          error: null,
        });
      } else {
        loginPromise = supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
      }

      // Race between login and timeout
      const { data, error } = (await Promise.race([
        loginPromise,
        timeoutPromise,
      ])) as any;

      if (error) throw error;

      // Jika login sukses, kita tidak perlu fetch profile manual di sini.
      // useAuth hook (Global) akan mendeteksi sesi baru, mengambil profile,
      // dan _layout.tsx akan otomatis me-redirect user.
      
      showToast("Login berhasil! Mengalihkan...", "success");
      
      // Kita biarkan loading tetap true agar user tidak bisa klik tombol lagi
      // sampai navigasi terjadi otomatis oleh _layout.tsx
      
    } catch (error: any) {
      setLoading(false); // Stop loading only on error
      let errorMessage = error.message || "Gagal login";

      if (errorMessage === "Request timeout") {
        errorMessage = "Koneksi lambat. Silakan coba lagi.";
      } else if (errorMessage.includes("Invalid login credentials")) {
        errorMessage = "Email atau password salah.";
      } else if (errorMessage.includes("Email not confirmed")) {
        errorMessage =
          "Email belum diverifikasi. Silakan cek inbox email Anda.";
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
              <Text style={styles.title}>Selamat Datang!</Text>
              <Text style={styles.subtitle}>Masuk untuk melanjutkan</Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
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
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
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
                  placeholder="Masukkan password"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={setPassword}
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

            <View style={styles.forgotPassword}>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setTimeout(() => {
                    router.replace("/(auth)/forgot-password");
                  }, 100);
                }}
              >
                <Text style={styles.forgotPasswordText}>Lupa Password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Masuk</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Belum punya akun? </Text>
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                setTimeout(() => {
                  router.replace("/(auth)/register");
                }, 100);
              }}
            >
              <Text style={styles.footerLink}>Daftar Sekarang</Text>
            </TouchableOpacity>
            {/* Dev Quick Login Helper - REMOVED for Production */}
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
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 40,
    marginTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTextContainer: {
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1e293b",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
  },
  form: {
    gap: 20,
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
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1e293b",
  },
  forgotPassword: {
    alignItems: "flex-end",
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  button: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
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
