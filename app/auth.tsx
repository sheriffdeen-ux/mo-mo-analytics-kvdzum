
import React, { useState, useEffect } from "react";
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

type AuthMode = "email" | "otp";

export default function AuthScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { loading: authLoading } = useAuth();

  const [mode, setMode] = useState<AuthMode>("email");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [deviceFingerprint, setDeviceFingerprint] = useState("");
  const [devModeOtp, setDevModeOtp] = useState<string | null>(null);

  useEffect(() => {
    generateDeviceFingerprint();
  }, []);

  const generateDeviceFingerprint = async () => {
    const deviceId = Device.modelId || "unknown-device";
    const osVersion = Device.osVersion || "unknown";
    const brand = Device.brand || "unknown";
    const fingerprint = `${deviceId}-${brand}-${osVersion}-${Date.now()}`;
    setDeviceFingerprint(fingerprint);
    console.log("[Auth] Device fingerprint generated:", fingerprint);
  };

  if (authLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? colors.background : "#fff" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const validateEmail = (emailText: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailText);
  };

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    
    if (cleaned.startsWith("233")) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith("0")) {
      return `+233${cleaned.substring(1)}`;
    } else if (cleaned.length === 9) {
      return `+233${cleaned}`;
    } else if (cleaned.length > 0) {
      return `+233${cleaned}`;
    }
    
    return text;
  };

  const handleSendOTP = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!fullName) {
      setError("Please enter your full name");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");
    console.log("[Auth] Sending OTP to email:", email);

    try {
      const { apiPost } = await import('@/utils/api');
      
      const requestBody: any = {
        email: email.toLowerCase().trim(),
        fullName: fullName.trim(),
      };

      if (phoneNumber) {
        const formattedPhone = formatPhoneNumber(phoneNumber);
        requestBody.phoneNumber = formattedPhone;
      }

      const response = await apiPost('/api/auth/email/send-otp', requestBody);
      
      if (response.success === false) {
        throw new Error(response.error || "Failed to send OTP");
      }
      
      // Check if backend returned OTP code (development mode only)
      if (response.otpCode) {
        setDevModeOtp(response.otpCode);
        console.log("🔓 [DEV MODE] OTP code received from backend:", response.otpCode);
      } else {
        setDevModeOtp(null);
      }
      
      setOtpSent(true);
      setMode("otp");
      setSuccessMessage(`OTP sent to ${email}. Please check your email inbox.`);
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

      console.log("✅ OTP sent successfully to", email);
    } catch (err: any) {
      console.error("❌ Failed to send OTP:", err);
      let errorMessage = "Failed to send OTP. Please check your email and try again.";
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError("Please enter the complete 6-digit OTP code");
      return;
    }

    if (!/^\d{6}$/.test(otpCode)) {
      setError("OTP code must contain only numbers");
      return;
    }

    setLoading(true);
    setError("");
    console.log("[Auth] Verifying OTP for:", email);

    try {
      const { apiPost, setBearerToken } = await import('@/utils/api');
      
      const requestBody: any = {
        email: email.toLowerCase().trim(),
        otpCode,
        fullName: fullName.trim(),
        deviceId: deviceFingerprint,
      };

      if (phoneNumber) {
        const formattedPhone = formatPhoneNumber(phoneNumber);
        requestBody.phoneNumber = formattedPhone;
      }

      const response = await apiPost('/api/auth/email/verify-otp', requestBody);
      
      if (response.success === false) {
        throw new Error(response.error || "Invalid OTP code");
      }
      
      if (response.accessToken) {
        await setBearerToken(response.accessToken);
        console.log("[Auth] Access token stored successfully");
      }
      
      console.log("✅ OTP verified successfully, redirecting to home...");
      router.replace("/(tabs)/(home)/");
    } catch (err: any) {
      console.error("❌ OTP verification failed:", err);
      let errorMessage = "Invalid OTP code. Please check and try again.";
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
      setOtpCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    setError("");
    setSuccessMessage("");
    setOtpCode("");
    console.log("[Auth] Resending OTP to:", email);

    try {
      const { apiPost } = await import('@/utils/api');
      const response = await apiPost('/api/auth/email/resend-otp', {
        email: email.toLowerCase().trim(),
      });
      
      if (response.success === false) {
        throw new Error(response.error || "Failed to resend OTP");
      }
      
      // Check if backend returned OTP code (development mode only)
      if (response.otpCode) {
        setDevModeOtp(response.otpCode);
        console.log("🔓 [DEV MODE] OTP code received from backend:", response.otpCode);
      } else {
        setDevModeOtp(null);
      }
      
      setSuccessMessage("New OTP sent! Please check your email inbox.");
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

      console.log("✅ OTP resent successfully to", email);
    } catch (err: any) {
      console.error("❌ Failed to resend OTP:", err);
      let errorMessage = "Failed to resend OTP. Please try again.";
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
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
            {mode === "email" && "Enter your details to get started"}
            {mode === "otp" && "Enter the OTP code sent to your email"}
          </Text>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {devModeOtp ? (
            <View style={styles.devModeContainer}>
              <Text style={styles.devModeTitle}>🔓 Development Mode</Text>
              <Text style={styles.devModeText}>Your OTP code is:</Text>
              <Text style={styles.devModeOtp}>{devModeOtp}</Text>
              <Text style={styles.devModeNote}>
                (This is only shown in preview mode. In production, you'll receive the OTP via email only.)
              </Text>
            </View>
          ) : null}

          {mode === "email" ? (
            <React.Fragment>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                placeholder="Email Address"
                placeholderTextColor={isDark ? colors.textSecondary : "#999"}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

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
                placeholder="Phone Number (Optional, e.g., 0241234567)"
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
          ) : mode === "otp" ? (
            <React.Fragment>
              <View style={styles.emailDisplay}>
                <Text style={[styles.emailDisplayText, { color: textColor }]}>
                  {email}
                </Text>
                <TouchableOpacity onPress={() => setMode("email")}>
                  <Text style={[styles.changeEmailText, { color: colors.primary }]}>Change</Text>
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
          ) : null}

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
    width: 120,
    height: 120,
    borderRadius: 60,
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
  successContainer: {
    backgroundColor: "#e8f5e9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: "#2e7d32",
    fontSize: 14,
    textAlign: "center",
  },
  devModeContainer: {
    backgroundColor: "#fff3cd",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#ffc107",
  },
  devModeTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#856404",
    marginBottom: 8,
    textAlign: "center",
  },
  devModeText: {
    fontSize: 14,
    color: "#856404",
    marginBottom: 4,
    textAlign: "center",
  },
  devModeOtp: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#856404",
    textAlign: "center",
    letterSpacing: 8,
    marginVertical: 8,
  },
  devModeNote: {
    fontSize: 12,
    color: "#856404",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
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
  emailDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  emailDisplayText: {
    fontSize: 16,
    fontWeight: "600",
  },
  changeEmailText: {
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
