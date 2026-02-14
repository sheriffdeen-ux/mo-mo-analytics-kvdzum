
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  useColorScheme,
  Image,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { colors } from "@/styles/commonStyles";
import * as Device from "expo-device";

type AuthMode = "phone" | "otp" | "email";

export default function AuthScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { signInWithPhone, verifyOTP, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<AuthMode>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  if (authLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? colors.background : "#fff" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    if (cleaned.startsWith("233")) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith("0")) {
      return `+233${cleaned.substring(1)}`;
    } else if (cleaned.length > 0) {
      return `+233${cleaned}`;
    }
    return text;
  };

  const handleSendOTP = async () => {
    if (!phoneNumber) {
      setError("Please enter your phone number");
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (formattedPhone.length < 13) {
      setError("Please enter a valid Ghana phone number");
      return;
    }

    setLoading(true);
    setError("");
    console.log("[Auth] Sending OTP to:", formattedPhone);

    try {
      await signInWithPhone(formattedPhone);
      setOtpSent(true);
      setMode("otp");
      setCountdown(60);
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      console.log("✅ OTP sent successfully");
    } catch (err: any) {
      console.error("❌ Failed to send OTP:", err);
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError("Please enter the 6-digit OTP code");
      return;
    }

    setLoading(true);
    setError("");
    console.log("[Auth] Verifying OTP for:", phoneNumber);

    try {
      const deviceId = Device.modelId || "unknown-device";
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      await verifyOTP(formattedPhone, otpCode, fullName || undefined, deviceId);
      console.log("✅ OTP verified successfully, redirecting...");
      router.replace("/(tabs)/(home)/");
    } catch (err: any) {
      console.error("❌ OTP verification failed:", err);
      setError(err.message || "Invalid OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    setError("");
    console.log("[Auth] Resending OTP to:", phoneNumber);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      await signInWithPhone(formattedPhone);
      setCountdown(60);
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      console.log("✅ OTP resent successfully");
    } catch (err: any) {
      console.error("❌ Failed to resend OTP:", err);
      setError(err.message || "Failed to resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const backgroundColor = isDark ? colors.background : "#fff";
  const textColor = isDark ? colors.text : "#000";
  const inputBg = isDark ? colors.cardBackground : "#fff";
  const inputBorder = isDark ? colors.border : "#ddd";

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/dfc609a7-2eaa-4fb8-a7ed-b8f157351210.jpeg')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={[styles.title, { color: textColor }]}>
            MoMo Analytics
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? colors.textSecondary : "#666" }]}>
            {mode === "phone" ? "Enter your phone number to get started" : "Enter the OTP code sent to your phone"}
          </Text>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {mode === "phone" ? (
            <React.Fragment>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                placeholder="Full Name"
                placeholderTextColor={isDark ? colors.textSecondary : "#999"}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />

              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                placeholder="Phone Number (e.g., 0241234567)"
                placeholderTextColor={isDark ? colors.textSecondary : "#999"}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleSendOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <View style={styles.phoneDisplay}>
                <Text style={[styles.phoneDisplayText, { color: textColor }]}>
                  {formatPhoneNumber(phoneNumber)}
                </Text>
                <TouchableOpacity onPress={() => setMode("phone")}>
                  <Text style={[styles.changePhoneText, { color: colors.primary }]}>Change</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.otpInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                placeholder="Enter 6-digit OTP"
                placeholderTextColor={isDark ? colors.textSecondary : "#999"}
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={6}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleVerifyOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify OTP</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendOTP}
                disabled={countdown > 0 || loading}
              >
                <Text style={[styles.resendText, { color: countdown > 0 ? (isDark ? colors.textSecondary : "#999") : colors.primary }]}>
                  {countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP"}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          )}

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: isDark ? colors.textSecondary : "#666" }]}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 200,
    height: 200,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: "#fee",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#c00",
    fontSize: 14,
    textAlign: "center",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  otpInput: {
    height: 60,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 8,
    fontWeight: "600",
  },
  phoneDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  phoneDisplayText: {
    fontSize: 18,
    fontWeight: "600",
  },
  changePhoneText: {
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resendButton: {
    marginTop: 16,
    alignItems: "center",
  },
  resendText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});
