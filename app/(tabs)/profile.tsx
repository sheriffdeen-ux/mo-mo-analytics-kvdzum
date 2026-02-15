
import { GlassView } from "expo-glass-effect";
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, TextInput, ActivityIndicator, useColorScheme, Modal, Pressable } from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { useAuth } from "@/contexts/AuthContext";
import { colors } from "@/styles/commonStyles";
import { useRouter, Link } from "expo-router";
import { useTheme } from "@react-navigation/native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

interface UserSettings {
  dailyLimit: number;
  blockedMerchants: string[];
  trustedMerchants: string[];
  smsReadPreference?: string;
}

interface SubscriptionStatus {
  subscriptionStatus: string;
  currentPlan: string;
  trialEndDate?: string;
  daysRemaining?: number;
  features: string[];
}



export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    dailyLimit: 2000,
    blockedMerchants: [],
    trustedMerchants: [],
    smsReadPreference: "momo_only",
  });
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");

  useEffect(() => {
    loadSettings();
    loadSubscriptionStatus();
  }, []);

  const { colors: themeColors } = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();

  const loadSettings = async () => {
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet('/api/settings');
      if (data) {
        setSettings(data);
      }
    } catch (error: any) {
      console.error("[Profile] Failed to load settings:", error);
      
      // Set default settings on error
      setSettings({
        dailyLimit: 2000,
        blockedMerchants: [],
        trustedMerchants: [],
        smsReadPreference: "momo_only",
      });
      
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        console.log('[Profile] Authentication error - user may need to re-login');
      }
    }
  };

  const loadSubscriptionStatus = async () => {
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet('/api/subscriptions/status');
      if (data) {
        setSubscriptionStatus(data);
      }
    } catch (error: any) {
      console.error("[Profile] Failed to load subscription status:", error);
      
      // Set default subscription status for testing mode
      setSubscriptionStatus({
        subscriptionStatus: 'trial',
        currentPlan: 'Free Trial',
        daysRemaining: 14,
        features: [
          'Basic fraud detection',
          'SMS analysis',
          'Transaction history',
        ],
      });
      
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        console.log('[Profile] Authentication error - user may need to re-login');
      }
    }
  };



  const saveSettings = async () => {
    setLoading(true);
    try {
      const { authenticatedPost } = await import('@/utils/api');
      await authenticatedPost('/api/update-settings', settings);
      console.log("[Profile] Settings saved successfully");
    } catch (error) {
      console.error("[Profile] Failed to save settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setShowSignOutModal(false);
    setLoading(true);
    try {
      await signOut();
      console.log("[Profile] User signed out successfully");
      router.replace("/auth");
    } catch (error) {
      console.error("[Profile] Sign out failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email) {
      setVerificationMessage("No email address found");
      return;
    }

    setResendingVerification(true);
    setVerificationMessage("");
    console.log("[Profile] Resending verification email to:", user.email);

    try {
      const { apiPost } = await import('@/utils/api');
      
      const response = await apiPost('/api/auth/resend-verification-link', {
        email: user.email,
      });
      
      if (response.success === false) {
        throw new Error(response.error || response.message || "Failed to resend verification email");
      }
      
      setVerificationMessage("Verification email sent! Please check your inbox.");
      console.log("✅ Verification email sent successfully");
    } catch (err: any) {
      console.error("❌ Failed to resend verification email:", err);
      const errorMessage = err?.message || "Failed to send verification email. Please try again.";
      setVerificationMessage(errorMessage);
    } finally {
      setResendingVerification(false);
    }
  };



  const getSubscriptionBadgeColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "trial") return colors.warning;
    if (statusLower === "pro" || statusLower === "business") return colors.success;
    return colors.textSecondary;
  };



  const formatDaysRemaining = () => {
    if (!subscriptionStatus?.daysRemaining) return "";
    const days = subscriptionStatus.daysRemaining;
    if (days === 1) return "1 day remaining";
    return `${days} days remaining`;
  };

  const backgroundColor = isDark ? colors.background : "#f5f5f5";
  const cardBg = isDark ? colors.cardBackground : "#fff";
  const textColor = isDark ? colors.text : "#000";
  const textSecondary = isDark ? colors.textSecondary : "#666";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: cardBg }]}>
          <View style={styles.avatarContainer}>
            <IconSymbol
              ios_icon_name="person.circle.fill"
              android_material_icon_name="account-circle"
              size={80}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.userName, { color: textColor }]}>
            {user?.fullName || user?.name || "User"}
          </Text>
          <Text style={[styles.userEmail, { color: textSecondary }]}>
            {user?.email || user?.phoneNumber || ""}
          </Text>
          
          {subscriptionStatus && (
            <View style={[styles.subscriptionBadge, { backgroundColor: getSubscriptionBadgeColor(subscriptionStatus.subscriptionStatus) }]}>
              <Text style={styles.subscriptionBadgeText}>
                {subscriptionStatus.currentPlan.toUpperCase()}
              </Text>
            </View>
          )}
          
          {subscriptionStatus?.daysRemaining && (
            <Text style={[styles.trialText, { color: textSecondary }]}>
              {formatDaysRemaining()}
            </Text>
          )}

          {/* Email Verification Status - Optional for Testing */}
          {user?.email && (
            <View style={styles.verificationContainer}>
              <View style={styles.verifiedBadge}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={16}
                  color={colors.success}
                />
                <Text style={[styles.verifiedText, { color: colors.success }]}>
                  Account Active (Testing Mode)
                </Text>
              </View>
              <Text style={[styles.testingNote, { color: textSecondary }]}>
                Email verification bypassed for testing
              </Text>
            </View>
          )}
        </View>



        {/* Security & Fraud Detection */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Security & Fraud Detection
          </Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/alerts")}
          >
            <IconSymbol
              ios_icon_name="bell.badge.fill"
              android_material_icon_name="notifications"
              size={24}
              color={colors.warning}
            />
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: textColor }]}>
                Security Alerts
              </Text>
              <Text style={[styles.menuSubtitle, { color: textSecondary }]}>
                View and manage fraud alerts
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/chatbot")}
          >
            <IconSymbol
              ios_icon_name="message.badge.fill"
              android_material_icon_name="chat"
              size={24}
              color={colors.accent}
            />
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: textColor }]}>
                AI Fraud Analyzer
              </Text>
              <Text style={[styles.menuSubtitle, { color: textSecondary }]}>
                Analyze SMS messages for fraud
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/blacklist")}
          >
            <IconSymbol
              ios_icon_name="hand.raised.fill"
              android_material_icon_name="block"
              size={24}
              color={colors.error}
            />
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: textColor }]}>
                Blacklist
              </Text>
              <Text style={[styles.menuSubtitle, { color: textSecondary }]}>
                Manage blocked recipients
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Settings & Reports */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Settings & Reports
          </Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/upgrade")}
          >
            <IconSymbol
              ios_icon_name="star.fill"
              android_material_icon_name="star"
              size={24}
              color={colors.warning}
            />
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: textColor }]}>
                Upgrade Plan
              </Text>
              <Text style={[styles.menuSubtitle, { color: textSecondary }]}>
                Unlock premium features
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/sms-settings")}
          >
            <IconSymbol
              ios_icon_name="message.fill"
              android_material_icon_name="message"
              size={24}
              color={colors.success}
            />
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: textColor }]}>
                SMS Auto-Reply Settings
              </Text>
              <Text style={[styles.menuSubtitle, { color: textSecondary }]}>
                Configure chatbot responses
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/financial-reports")}
          >
            <IconSymbol
              ios_icon_name="chart.bar.fill"
              android_material_icon_name="assessment"
              size={24}
              color={colors.warning}
            />
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: textColor }]}>
                Financial Reports
              </Text>
              <Text style={[styles.menuSubtitle, { color: textSecondary }]}>
                Daily, weekly, monthly summaries
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/privacy-policy")}
          >
            <IconSymbol
              ios_icon_name="hand.raised.fill"
              android_material_icon_name="security"
              size={24}
              color={colors.primary}
            />
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: textColor }]}>
                Privacy Policy
              </Text>
              <Text style={[styles.menuSubtitle, { color: textSecondary }]}>
                How we protect your data
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: colors.error }]}
          onPress={() => setShowSignOutModal(true)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <React.Fragment>
              <IconSymbol
                ios_icon_name="arrow.right.square.fill"
                android_material_icon_name="logout"
                size={24}
                color="#fff"
              />
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </React.Fragment>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Sign Out Confirmation Modal */}
      <Modal
        visible={showSignOutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSignOutModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              Sign Out
            </Text>
            <Text style={[styles.modalText, { color: textSecondary }]}>
              Are you sure you want to sign out?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.error }]}
                onPress={handleSignOut}
              >
                <Text style={styles.modalButtonText}>Sign Out</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: isDark ? colors.cardBackground : "#f0f0f0" }]}
                onPress={() => setShowSignOutModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: textColor }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  profileHeader: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 12,
  },
  subscriptionBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  subscriptionBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  trialText: {
    fontSize: 14,
    marginTop: 8,
  },
  verificationContainer: {
    marginTop: 16,
    width: "100%",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  verifiedText: {
    fontSize: 14,
    fontWeight: "600",
  },
  unverifiedContainer: {
    alignItems: "center",
  },
  unverifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 12,
  },
  unverifiedText: {
    fontSize: 14,
    fontWeight: "600",
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  verificationMessage: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  testingNote: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
    fontStyle: "italic",
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 14,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  signOutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

});
