
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
  const cardColor = isDark ? colors.cardDark : colors.card;

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

═══════════════════════════════════════════════════════
1. INTRODUCTION
═══════════════════════════════════════════════════════

Welcome to MoMo Analytics - Ghana's premier Mobile Money fraud detection and financial analytics platform. We are committed to protecting your privacy and ensuring the security of your personal and financial information.

This Privacy Policy explains how we collect, use, store, and protect your data when you use our services.

═══════════════════════════════════════════════════════
2. INFORMATION WE COLLECT
═══════════════════════════════════════════════════════

2.1 Account Information:
• Email Address (for authentication and communication)
• Full Name (for personalization)
• Phone Number (optional, for SMS alerts)
• Password (encrypted and hashed - never stored in plain text)

2.2 Transaction Data (Extracted from MoMo SMS):
• Transaction Amount (GHS)
• Recipient/Sender Phone Number or Name
• Transaction Type (sent, received, withdrawal, deposit)
• Provider (MTN MoMo, Vodafone Cash, AirtelTigo Money)
• Transaction Date and Time
• Reference Number
• Account Balance (after transaction)

2.3 Device Information:
• Device ID (for security and multi-device support)
• Device Fingerprint (for fraud detection)
• Operating System and Version
• App Version
• FCM Token (for push notifications)

2.4 Usage Data:
• Login timestamps
• Feature usage patterns
• Transaction analysis history
• Alert interactions
• Settings preferences

═══════════════════════════════════════════════════════
3. SMS MESSAGE HANDLING - CRITICAL PRIVACY GUARANTEE
═══════════════════════════════════════════════════════

🔒 PRIVACY GUARANTEE: We DO NOT store your raw SMS messages in our database.

How SMS Processing Works:
1. SMS is read locally on your device
2. Our app identifies if it's a MoMo transaction SMS
3. Transaction data is extracted (amount, recipient, time, reference)
4. Only the structured transaction data is sent to our servers
5. Raw SMS text is NEVER stored in our database
6. Personal conversations are NEVER accessed

You Control SMS Access:
• Enable/Disable SMS reading at any time in Settings
• Choose between auto-detection or manual input
• Revoke SMS permissions through device settings
• View transparency report of SMS scans

═══════════════════════════════════════════════════════
4. HOW WE USE YOUR INFORMATION
═══════════════════════════════════════════════════════

4.1 Fraud Detection (7-Layer Security Framework):
• Layer 1: SMS Capture & Parsing
• Layer 2: Input Validation & Sanitization
• Layer 3: Pattern Recognition & NLP (scam keyword detection)
• Layer 4: Behavioral Analytics (velocity checks, anomaly detection)
• Layer 5: Real-Time Risk Scoring (0-100 scale)
• Layer 6: Alert System (LOW/MEDIUM/HIGH/CRITICAL alerts)
• Layer 7: Compliance & Audit Trail

4.2 Financial Analytics:
• Daily, weekly, and monthly spending reports
• Total sent vs. received analysis
• Average transaction amounts
• Spending trends and patterns
• Fraud prevention savings

4.3 Personalization:
• Customized risk thresholds
• Trusted/blocked merchant lists
• Daily spending limits
• Alert preferences

4.4 Security:
• Multi-device authentication
• Suspicious login detection
• Device trust management
• Behavioral phone binding

═══════════════════════════════════════════════════════
5. DATA SECURITY MEASURES
═══════════════════════════════════════════════════════

5.1 Encryption:
• All data encrypted in transit (TLS/SSL)
• All data encrypted at rest (AES-256)
• End-to-end encryption for sensitive operations

5.2 Authentication:
• Secure JWT token-based authentication
• Password hashing using bcrypt (industry standard)
• OTP codes hashed and never stored in plain text
• PINs never stored in plain text
• Multi-factor authentication support

5.3 Access Control:
• Role-based access control (RBAC)
• User data isolation (you only see your data)
• Admin access logged and audited
• Rate limiting to prevent abuse

5.4 Monitoring:
• Real-time security monitoring
• Automated threat detection
• Comprehensive audit logs
• Regular security audits

═══════════════════════════════════════════════════════
6. PAYMENT PROCESSING
═══════════════════════════════════════════════════════

• Payments processed securely through Paystack (PCI DSS compliant)
• We DO NOT store your payment card information
• All payment transactions are encrypted
• Subscription management through secure API
• Automatic renewal with email notifications

═══════════════════════════════════════════════════════
7. DATA SHARING & THIRD PARTIES
═══════════════════════════════════════════════════════

We DO NOT sell, rent, or share your personal information with third parties.

Limited Data Sharing (Only When Necessary):
• Paystack: For payment processing (card details never touch our servers)
• Arkesel: For SMS OTP delivery (only phone number and OTP code)
• Google Gemini AI: For chatbot analysis (only transaction data, no personal info)
• Law Enforcement: When legally required by Ghanaian law

We DO NOT share with:
• Advertisers
• Data brokers
• Marketing companies
• Social media platforms

═══════════════════════════════════════════════════════
8. YOUR RIGHTS (GDPR & DATA PROTECTION ACT 2012)
═══════════════════════════════════════════════════════

You have the right to:
✓ Access your data (download all your data)
✓ Rectify incorrect data (update your profile)
✓ Erase your data (delete your account)
✓ Restrict processing (disable SMS reading)
✓ Data portability (export to CSV/JSON)
✓ Object to processing (opt-out of analytics)
✓ Withdraw consent (revoke SMS permissions)
✓ Lodge a complaint (contact Data Protection Commission)

How to Exercise Your Rights:
• Go to Settings > Privacy & Data
• Email: privacy@momoanalytics.com
• In-app support chat

═══════════════════════════════════════════════════════
9. DATA RETENTION
═══════════════════════════════════════════════════════

• Transaction Data: Retained for the duration of your subscription + 90 days
• Account Data: Retained until you request deletion
• Audit Logs: Retained for 1 year (for security and compliance)
• Deleted Data: Permanently removed within 30 days
• Backup Data: Removed from backups within 90 days

═══════════════════════════════════════════════════════
10. SUBSCRIPTION PLANS
═══════════════════════════════════════════════════════

• Free: Basic features, 30-day transaction history
• Trial: 14-day free access to all Pro features
• Pro: Advanced fraud protection, unlimited history, priority support
• Business: Multi-user accounts, API access, custom integrations

═══════════════════════════════════════════════════════
11. CHILDREN'S PRIVACY
═══════════════════════════════════════════════════════

MoMo Analytics is not intended for users under 18 years old. We do not knowingly collect data from children. If you believe a child has provided us with personal information, please contact us immediately.

═══════════════════════════════════════════════════════
12. INTERNATIONAL DATA TRANSFERS
═══════════════════════════════════════════════════════

Your data is primarily stored on servers in Ghana. If data is transferred internationally, we ensure adequate protection through:
• Standard Contractual Clauses (SCCs)
• Encryption in transit and at rest
• Compliance with GDPR and local data protection laws

═══════════════════════════════════════════════════════
13. COOKIES & TRACKING
═══════════════════════════════════════════════════════

We use minimal cookies for:
• Authentication (session management)
• Security (CSRF protection)
• Analytics (app usage statistics)

We DO NOT use:
• Advertising cookies
• Third-party tracking pixels
• Cross-site tracking

═══════════════════════════════════════════════════════
14. CHANGES TO THIS POLICY
═══════════════════════════════════════════════════════

We may update this privacy policy from time to time. We will notify you of any material changes by:
• Email notification
• In-app notification
• Posting the new policy on this page

Continued use of the app after changes constitutes acceptance of the updated policy.

═══════════════════════════════════════════════════════
15. CONTACT US
═══════════════════════════════════════════════════════

For privacy concerns, data requests, or questions:

Email: privacy@momoanalytics.com
Support: support@momoanalytics.com
Phone: +233 (0) 24 123 4567
Address: Accra, Ghana

Data Protection Officer: dpo@momoanalytics.com

═══════════════════════════════════════════════════════
16. LEGAL BASIS FOR PROCESSING (GDPR)
═══════════════════════════════════════════════════════

We process your data based on:
• Consent: SMS reading, marketing communications
• Contract: Providing fraud detection services
• Legitimate Interest: Security, fraud prevention, analytics
• Legal Obligation: Compliance with Ghanaian law

═══════════════════════════════════════════════════════
17. SECURITY INCIDENT RESPONSE
═══════════════════════════════════════════════════════

In the event of a data breach:
• We will notify affected users within 72 hours
• We will notify the Data Protection Commission
• We will provide details of the breach and remediation steps
• We will offer credit monitoring if financial data is compromised

═══════════════════════════════════════════════════════

By using MoMo Analytics, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.

Last Updated: ${new Date().toLocaleDateString()}
Version: 2.0`;
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
