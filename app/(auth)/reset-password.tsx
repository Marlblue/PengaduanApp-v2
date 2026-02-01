import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { user, session, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // State baru untuk menangani race condition deep link
  const [verifyingToken, setVerifyingToken] = useState(true);
  const [localSessionValid, setLocalSessionValid] = useState(false);
  const { visible, message, type, showToast, hideToast } = useToast();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkSession = async () => {
      // Jika auth masih loading, kita tunggu saja (UI loading dari authLoading)
      if (authLoading) return;

      // Jika session sudah ada (dari context), berarti valid
      if (session) {
        setVerifyingToken(false);
        return;
      }

      // Jika session null & auth selesai loading, JANGAN langsung error.
      // Tunggu sebentar (grace period) karena useDeepLinks mungkin sedang memproses token.
      setVerifyingToken(true);

      timeoutId = setTimeout(async () => {
        // Cek ulang manual ke supabase untuk memastikan
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (currentSession) {
          setLocalSessionValid(true);
        }
        
        // Apapun hasilnya, stop loading spinner setelah timeout
        setVerifyingToken(false);
      }, 2500); // 2.5 detik toleransi
    };

    checkSession();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [session, authLoading]);

  // If we are still waiting for auth to initialize or deep link to process
  // Kita gabungkan authLoading ATAU verifyingToken (jika session null)
  if (authLoading || (verifyingToken && !session && !localSessionValid)) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 20, color: Colors.textLight }}>
          Memverifikasi link reset password...
        </Text>
      </View>
    );
  }

  // If after loading we still have no session, show error UI instead of auto-redirecting
  if (!session && !localSessionValid) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Ionicons name="warning-outline" size={64} color={Colors.error} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            marginTop: 16,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Link Tidak Valid atau Kadaluarsa
        </Text>
        <Text
          style={{
            color: Colors.textLight,
            textAlign: "center",
            marginBottom: 24,
            paddingHorizontal: 32,
          }}
        >
          Link reset password yang Anda gunakan mungkin sudah kadaluarsa atau
          sudah digunakan.
        </Text>
        <TouchableOpacity
          style={[styles.button, { width: "80%" }]}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={styles.buttonText}>Kembali ke Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      showToast("Harap isi semua field", "warning");
      return;
    }

    if (password !== confirmPassword) {
      showToast("Password tidak cocok", "error");
      return;
    }

    if (password.length < 6) {
      showToast("Password minimal 6 karakter", "error");
      return;
    }

    setLoading(true);
    try {
      // Langsung panggil updateUser tanpa timeout manual
      // Biarkan Supabase client yang menangani request sampai selesai
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        showToast(error.message, "error");
        return;
      }

      showToast("Password berhasil diubah. Silakan login kembali.", "success");
      
      // Delay sedikit sebelum signout dan redirect agar toast terbaca
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.replace("/(auth)/login");
      }, 2000);
    } catch (error: any) {
      showToast("Terjadi kesalahan saat mengubah password", "error");
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
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>Masukkan password baru Anda</Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password Baru</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={Colors.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan password baru"
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
                  placeholder="Konfirmasi password baru"
                  placeholderTextColor="#94a3b8"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={20}
                    color={Colors.textLight}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleUpdatePassword}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Ubah Password</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
              <Text style={styles.footerLink}>Batal</Text>
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
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 40,
    marginTop: 10,
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
  footerLink: {
    color: Colors.primary,
    fontWeight: "bold",
    fontSize: 14,
  },
});
