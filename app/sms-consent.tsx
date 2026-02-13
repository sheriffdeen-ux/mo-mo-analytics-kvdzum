
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Switch,
  Platform,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import { useAuth } from "@/contexts/AuthContext";

export default function SMSConsentScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [smsConsentGiven, setSmsConsentGiven] = useState(false);
  const [autoDetectionEnabled, setAutoDetectionEnabled] = useState(false);
  const [scanStats, setScanStats] = useState({
    totalScans: 0,
    momoSmsFound: 0,
    lastScanDate: null as string | null,
  });

  useEffect(() => {
    loadSettings();
    loadScanStats();
  }, []);

  const loadSettings = async () => {
    try {
      if (user) {
        setSmsConsentGiven(user.smsConsentGiven || false);
        setAutoDetectionEnabled(user.smsAutoDetectionEnabled || false);
      }
    } catch (error) {
      console.error("[SMS Consent] Failed to load settings:", error);
    }
  };

  const loadScanStats = async () => {
    // TODO: Backend Integration - Implement /api/auth/sms-scan-stats endpoint
    // For now, show placeholder data
    console.log("[SMS Consent] SMS scan stats endpoint not yet implemented");
  };

  const handleToggleConsent = async (value: boolean) => {
    // TODO: Backend Integration - Implement /api/auth/sms-consent endpoint
    setLoading(true);
    try {
      // For now, just update local state
      setSmsConsentGiven(value);
      if (!value) {
        setAutoDetectionEnabled(false);
      }
      
      console.log("[SMS Consent] Consent updated locally (backend endpoint not yet implemented):", value);
    } catch (error) {
      console.error("[SMS Consent] Failed to update consent:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoDetection = async (value: boolean) => {
    if (!smsConsentGiven) {
      return;
    }
    
    // TODO: Backend Integration - Implement /api/auth/sms-consent endpoint
    setLoading(true);
    try {
      // For now, just update local state
      setAutoDetectionEnabled(value);
      
      console.log("[SMS Consent] Auto-detection updated locally (backend endpoint not yet implemented):", value);
    } catch (error) {
      console.error("[SMS Consent] Failed to update auto-detection:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const backgroundColor = isDark ? colors.background : "#f5f5f5";
  const cardBg = isDark ? colors.cardBackground : "#fff";
  const textColor = isDark ? colors.text : "#000";
  const textSecondary = isDark ? colors.textSecondary : "#666";

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Stack.Screen
        options={{
          title: "SMS Permissions",
          headerShown: true,
          headerBackTitle: "Back",
        }}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: cardBg }]}>
          <IconSymbol
            ios_icon_name="message.fill"
            android_material_icon_name="message"
            size={64}
            color={colors.primary}
          />
          <Text style={[styles.headerTitle, { color: textColor }]}>
            Data We Access
          </Text>
          <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
            Your privacy is our priority
          </Text>
        </View>

        {/* What We Access */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            What We Access
          </Text>
          
          <View style={styles.infoItem}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={24}
              color={colors.success}
            />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoTitle, { color: textColor }]}>
                Only MoMo SMS
              </Text>
              <Text style={[styles.infoText, { color: textSecondary }]}>
                We read only Mobile Money transaction messages from MTN, Vodafone, and AirtelTigo
              </Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <IconSymbol
              ios_icon_name="lock.shield.fill"
              android_material_icon_name="lock"
              size={24}
              color={colors.primary}
            />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoTitle, { color: textColor }]}>
                Processed Locally
              </Text>
              <Text style={[styles.infoText, { color: textSecondary }]}>
                SMS messages are scanned and parsed on your device. Only transaction data is sent to our servers
              </Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <IconSymbol
              ios_icon_name="xmark.circle.fill"
              android_material_icon_name="cancel"
              size={24}
              color={colors.error}
            />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoTitle, { color: textColor }]}>
                No Personal Chats
              </Text>
              <Text style={[styles.infoText, { color: textSecondary }]}>
                We never access personal conversations, WhatsApp, or any other messaging apps
              </Text>
            </View>
          </View>
        </View>

        {/* Permissions Control */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Permission Control
          </Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: textColor }]}>
                SMS Access
              </Text>
              <Text style={[styles.settingText, { color: textSecondary }]}>
                Allow app to read Mobile Money SMS
              </Text>
            </View>
            <Switch
              value={smsConsentGiven}
              onValueChange={handleToggleConsent}
              disabled={loading}
              trackColor={{ false: "#767577", true: colors.primary }}
              thumbColor={smsConsentGiven ? "#fff" : "#f4f3f4"}
            />
          </View>
          
          <View style={[styles.settingItem, { opacity: smsConsentGiven ? 1 : 0.5 }]}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: textColor }]}>
                Auto-Detection
              </Text>
              <Text style={[styles.settingText, { color: textSecondary }]}>
                Automatically detect new MoMo transactions
              </Text>
            </View>
            <Switch
              value={autoDetectionEnabled}
              onValueChange={handleToggleAutoDetection}
              disabled={loading || !smsConsentGiven}
              trackColor={{ false: "#767577", true: colors.primary }}
              thumbColor={autoDetectionEnabled ? "#fff" : "#f4f3f4"}
            />
          </View>
        </View>

        {/* Scan Statistics */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Transparency Report
          </Text>
          
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: textSecondary }]}>
              Total SMS Scanned
            </Text>
            <Text style={[styles.statValue, { color: textColor }]}>
              {scanStats.totalScans}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: textSecondary }]}>
              MoMo SMS Found
            </Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {scanStats.momoSmsFound}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: textSecondary }]}>
              Last Scan
            </Text>
            <Text style={[styles.statValue, { color: textColor }]}>
              {formatDate(scanStats.lastScanDate)}
            </Text>
          </View>
        </View>

        {/* Privacy Guarantee */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.primary, borderWidth: 2 }]}>
          <IconSymbol
            ios_icon_name="hand.raised.fill"
            android_material_icon_name="security"
            size={48}
            color={colors.primary}
          />
          <Text style={[styles.guaranteeTitle, { color: textColor }]}>
            Our Privacy Guarantee
          </Text>
          <Text style={[styles.guaranteeText, { color: textSecondary }]}>
            We never store raw SMS messages in our database. Only parsed transaction data (amount, date, provider) is stored. Your financial data stays protected.
          </Text>
        </View>

        {/* Manual Input Option */}
        <TouchableOpacity
          style={[styles.manualButton, { backgroundColor: isDark ? colors.cardBackground : "#f0f0f0" }]}
          onPress={() => router.push("/(tabs)/(home)/")}
        >
          <IconSymbol
            ios_icon_name="keyboard"
            android_material_icon_name="keyboard"
            size={24}
            color={colors.primary}
          />
          <Text style={[styles.manualButtonText, { color: textColor }]}>
            Prefer Manual Input?
          </Text>
          <Text style={[styles.manualButtonSubtext, { color: textSecondary }]}>
            You can always add transactions manually
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  headerCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: "center",
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
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  settingText: {
    fontSize: 14,
  },
  statItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statLabel: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  guaranteeTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  guaranteeText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  manualButton: {
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 32,
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  manualButtonSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
});
