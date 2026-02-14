
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  useColorScheme,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { colors } from "@/styles/commonStyles";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const token = params.token as string;

  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setLoading(false);
      setError("Invalid verification link. No token provided.");
    }
  }, [token]);

  const verifyEmail = async () => {
    console.log("[Verify Email] Verifying token:", token);
    setLoading(true);
    setError("");

    try {
      const { apiGet } = await import('@/utils/api');
      
      const response = await apiGet(`/api/auth/verify-email-link?token=${token}`);
      
      if (response.success === false) {
        throw new Error(response.error || response.message || "Failed to verify email");
      }
      
      console.log("✅ Email verified successfully");
      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.replace("/auth");
      }, 2000);
    } catch (err: any) {
      console.error("❌ Email verification failed:", err);
      const errorMessage = err?.message || "Failed to verify email. The link may have expired.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    console.log("[Verify Email] Resending verification email");
    setLoading(true);
    setError("");

    try {
      const { apiPost } = await import('@/utils/api');
      
      // Note: We don't have the email here, so user needs to go back to auth screen
      setError("Please go back to the login screen and request a new verification email.");
    } catch (err: any) {
      console.error("❌ Failed to resend verification:", err);
      setError(err?.message || "Failed to resend verification email");
    } finally {
      setLoading(false);
    }
  };

  const backgroundColor = isDark ? colors.background : "#fff";
  const textColor = isDark ? colors.text : "#000";

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/dfc609a7-2eaa-4fb8-a7ed-b8f157351210.jpeg')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={[styles.title, { color: textColor }]}>
          Email Verification
        </Text>

        {loading ? (
          <React.Fragment>
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            <Text style={[styles.message, { color: isDark ? colors.textSecondary : "#666" }]}>
              Verifying your email address...
            </Text>
          </React.Fragment>
        ) : success ? (
          <React.Fragment>
            <View style={styles.successIcon}>
              <Text style={styles.successEmoji}>✅</Text>
            </View>
            <Text style={[styles.successTitle, { color: colors.primary }]}>
              Email Verified!
            </Text>
            <Text style={[styles.message, { color: isDark ? colors.textSecondary : "#666" }]}>
              Your email has been successfully verified. Redirecting to login...
            </Text>
          </React.Fragment>
        ) : error ? (
          <React.Fragment>
            <View style={styles.errorIcon}>
              <Text style={styles.errorEmoji}>❌</Text>
            </View>
            <Text style={[styles.errorTitle, { color: "#c00" }]}>
              Verification Failed
            </Text>
            <Text style={[styles.errorMessage, { color: "#c00" }]}>
              {error}
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.replace("/auth")}
            >
              <Text style={styles.buttonText}>Go to Login</Text>
            </TouchableOpacity>
          </React.Fragment>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
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
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  loader: {
    marginVertical: 24,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 24,
  },
  successIcon: {
    marginVertical: 24,
  },
  successEmoji: {
    fontSize: 80,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  errorIcon: {
    marginVertical: 24,
  },
  errorEmoji: {
    fontSize: 80,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
