
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { colors } from "@/styles/commonStyles";

export default function PrivacyPolicyScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [loading, setLoading] = useState(true);
  const [policyText, setPolicyText] = useState("");

  const bgColor = isDark ? colors.background : "#fff";
  const textColor = isDark ? colors.text : "#000";
  const textSecondaryColor = isDark ? colors.textSecondary : "#666";

  useEffect(() => {
    loadPrivacyPolicy();
  }, []);

  const loadPrivacyPolicy = async () => {
    try {
      console.log("[Privacy] Loading privacy policy");
      const { apiGet } = await import("@/utils/api");
      const response = await apiGet<{ policy: string }>("/api/legal/privacy-policy");
      console.log("[Privacy] Policy loaded");
      setPolicyText(response.policy);
    } catch (error) {
      console.error("[Privacy] Failed to load policy:", error);
      // Fallback policy text
      setPolicyText(getDefaultPrivacyPolicy());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPrivacyPolicy = () => {
    return `MoMo Analytics Privacy Policy

Last Updated: ${new Date().toLocaleDateString()}

1. Introduction
Welcome to MoMo Analytics. We are committed to protecting your privacy and ensuring the security of your personal information.

2. Information We Collect
- Phone Number: Used for authentication and account identification
- Full Name: Used for personalization
- Transaction Data: We extract and store transaction information from your Mobile Money SMS messages
- Device Information: Device ID for security and multi-device support

3. SMS Message Handling
IMPORTANT: We DO NOT store your SMS messages. We only extract and store the following transaction information:
- Transaction amount
- Sender/Receiver name
- Transaction type (sent/received)
- Provider (MTN, Vodafone, AirtelTigo)
- Transaction date and time
- Balance information

You can choose in settings whether we read:
- Only Mobile Money SMS (recommended)
- All SMS messages

4. How We Use Your Information
- Fraud Detection: Analyze transactions using our 7-layer fraud detection engine
- Risk Scoring: Calculate risk scores to protect you from fraudulent transactions
- Analytics: Provide insights into your spending patterns
- Alerts: Send real-time notifications about suspicious activity
- Adaptive Learning: Improve fraud detection based on your feedback

5. Data Security
- All data is encrypted in transit and at rest
- OTP codes are hashed and never stored in plain text
- PINs are never stored in plain text
- Secure authentication using JWT tokens
- Rate limiting to prevent abuse

6. Payment Processing
- Payments are processed securely through Paystack
- We do not store your payment card information
- All transactions are encrypted

7. Data Sharing
We DO NOT sell, rent, or share your personal information with third parties except:
- When required by law
- To process payments through Paystack
- To send SMS OTP through Arkesel

8. Your Rights
You have the right to:
- Access your data
- Request data deletion
- Export your data
- Opt-out of SMS reading
- Cancel your subscription at any time

9. Data Retention
- Transaction data: Retained for the duration of your subscription
- Account data: Retained until you request deletion
- Deleted data is permanently removed within 30 days

10. Subscription Plans
- Free: Basic features with 30-day transaction history
- Trial: 14-day free access to all Pro features
- Pro: Advanced fraud protection and analytics
- Business: Complete MoMo monitoring for businesses

11. Contact Us
For privacy concerns or data requests, please contact us at:
support@momoanalytics.com

12. Changes to This Policy
We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.

By using MoMo Analytics, you agree to this privacy policy.`;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]} edges={["top"]}>
        <Stack.Screen
          options={{
            title: "Privacy Policy",
            headerShown: true,
            headerBackTitle: "Back",
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: textSecondaryColor }]}>
            Loading privacy policy...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]} edges={["top"]}>
      <Stack.Screen
        options={{
          title: "Privacy Policy",
          headerShown: true,
          headerBackTitle: "Back",
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={[styles.policyText, { color: textColor }]}>{policyText}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  policyText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
