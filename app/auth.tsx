
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

type AuthMode = "login" | "signup";

export default function AuthScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { loading: authLoading, fetchUser } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deviceFingerprint, setDeviceFingerprint] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  const handleSignup = async () => {
    console.log("[Auth] Signup attempt");
    
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!password) {
      setError("Please enter a password");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (!fullName) {
      setError("Please enter your full name");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");
    console.log("[Auth] Creating account for:", email);

    try {
      const { apiPost, setBearerToken } = await import('@/utils/api');
      
      const requestBody: any = {
        email: email.toLowerCase().trim(),
        password: password,
        fullName: fullName.trim(),
        deviceId: deviceFingerprint,
      };

      if (phoneNumber) {
        const formattedPhone = formatPhoneNumber(phoneNumber);
        requestBody.phoneNumber = formattedPhone;
      }

      console.log("[Auth] Sending signup request...");
      const response = await apiPost('/api/auth/signup', requestBody);
      
      if (response.success === false) {
        throw new Error(response.error || response.message || "Failed to create account");
      }
      
      console.log("[Auth] Signup response:", response);
      
      // Store the access token - backend now returns token immediately
      if (response.accessToken) {
        await setBearerToken(response.accessToken);
        console.log("[Auth] Access token stored successfully");
      } else if (response.token) {
        await setBearerToken(response.token);
        console.log("[Auth] Token stored successfully");
      }
      
      // Fetch user data to update context
      await fetchUser();
      
      console.log("✅ Account created successfully! Email verification bypassed for testing. Redirecting to home...");
      setSuccessMessage("Account created successfully! You can now use the app.");
      
      // Redirect to home page
      setTimeout(() => {
        router.replace("/(tabs)/(home)/");
      }, 500);
    } catch (err: any) {
      console.error("❌ Failed to create account:", err);
      let errorMessage = "Failed to create account. Please try again.";
      
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

  const handleLogin = async () => {
    console.log("[Auth] Login attempt");
    
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");
    console.log("[Auth] Logging in:", email);

    try {
      const { apiPost, setBearerToken } = await import('@/utils/api');
      
      const requestBody = {
        email: email.toLowerCase().trim(),
        password: password,
        deviceId: deviceFingerprint,
      };

      console.log("[Auth] Sending login request...");
      const response = await apiPost('/api/auth/login', requestBody);
      
      if (response.success === false) {
        throw new Error(response.error || response.message || "Invalid email or password");
      }
      
      console.log("[Auth] Login response:", response);
      
      // Store the access token - backend now allows login without email verification
      if (response.accessToken) {
        await setBearerToken(response.accessToken);
        console.log("[Auth] Access token stored successfully");
      } else if (response.token) {
        await setBearerToken(response.token);
        console.log("[Auth] Token stored successfully");
      }
      
      // Fetch user data to update context
      await fetchUser();
      
      console.log("✅ Login successful! Email verification not required for testing. Redirecting to home...");
      setSuccessMessage("Login successful! Welcome back.");
      
      // Redirect to home page
      setTimeout(() => {
        router.replace("/(tabs)/(home)/");
      }, 500);
    } catch (err: any) {
      console.error("❌ Login failed:", err);
      let errorMessage = "Invalid email or password. Please try again.";
      
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

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setError("");
    setSuccessMessage("");
    setPassword("");
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
            {mode === "login" ? "Sign in to your account" : "Create your account"}
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

          <TextInput
            style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
            placeholder="Email Address"
            placeholderTextColor={isDark ? colors.textSecondary : "#999"}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.passwordInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
              placeholder="Password"
              placeholderTextColor={isDark ? colors.textSecondary : "#999"}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              <Text style={[styles.eyeText, { color: isDark ? colors.textSecondary : "#666" }]}>
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </Text>
            </TouchableOpacity>
          </View>

          {mode === "signup" && (
            <React.Fragment>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                placeholder="Full Name"
                placeholderTextColor={isDark ? colors.textSecondary : "#999"}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                editable={!loading}
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
                editable={!loading}
              />
            </React.Fragment>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={mode === "login" ? handleLogin : handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {mode === "login" ? "Sign In" : "Create Account"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchModeButton}
            onPress={toggleMode}
            disabled={loading}
          >
            <Text style={[styles.switchModeText, { color: colors.primary }]}>
              {mode === "login" 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"}
            </Text>
          </TouchableOpacity>

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

  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  passwordContainer: {
    position: "relative",
    marginBottom: 16,
  },
  passwordInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingRight: 50,
    fontSize: 16,
  },
  eyeButton: {
    position: "absolute",
    right: 16,
    top: 13,
    padding: 4,
  },
  eyeText: {
    fontSize: 20,
  },
  switchModeButton: {
    marginTop: 16,
    alignItems: "center",
  },
  switchModeText: {
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
