
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';

export default function PrivacyPolicyScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardColor = isDark ? colors.cardDark : colors.card;

  const lastUpdatedText = 'February 14, 2026';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Privacy Policy',
          headerShown: true,
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: bgColor },
          headerTintColor: textColor,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.title, { color: textColor }]}>
            Privacy Policy
          </Text>
          <Text style={[styles.lastUpdated, { color: textSecondaryColor }]}>
            Last Updated: {lastUpdatedText}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            1. Introduction
          </Text>
          <Text style={[styles.paragraph, { color: textSecondaryColor }]}>
            MoMo Analytics ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application for fraud detection and financial analytics in Ghana.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            2. Information We Collect
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: textColor }]}>
            2.1 SMS Transaction Data
          </Text>
          <Text style={[styles.paragraph, { color: textSecondaryColor }]}>
            With your explicit consent, we access and analyze SMS messages from Mobile Money providers (MTN MoMo, Vodafone Cash, AirtelTigo Money) to extract transaction information including:
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Transaction amount (GHS)
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Recipient phone number
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Transaction timestamp
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Transaction reference number
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Account balance
          </Text>
          <Text style={[styles.paragraph, { color: textSecondaryColor }]}>
            Important: We do NOT store raw SMS message content. Only extracted transaction data is retained for fraud analysis.
          </Text>

          <Text style={[styles.subsectionTitle, { color: textColor }]}>
            2.2 Account Information
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Email address
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Full name
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Phone number (optional)
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Password (encrypted)
          </Text>

          <Text style={[styles.subsectionTitle, { color: textColor }]}>
            2.3 Device Information
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Device ID and fingerprint
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Operating system version
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • App version
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Push notification tokens
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            3. How We Use Your Information
          </Text>
          <Text style={[styles.paragraph, { color: textSecondaryColor }]}>
            We use the collected information for:
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Real-time fraud detection through our 7-layer security framework
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Risk scoring and behavioral analytics
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Generating financial reports (daily, weekly, monthly)
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Sending fraud alerts and notifications
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Improving our fraud detection algorithms
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Providing customer support
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            4. Data Security
          </Text>
          <Text style={[styles.paragraph, { color: textSecondaryColor }]}>
            We implement industry-standard security measures:
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • End-to-end encryption for data transmission (TLS/SSL)
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Encrypted storage for sensitive data at rest
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Secure authentication with hashed passwords
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Regular security audits and penetration testing
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Access controls and audit logging
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            5. Data Sharing and Disclosure
          </Text>
          <Text style={[styles.paragraph, { color: textSecondaryColor }]}>
            We do NOT sell your personal information. We may share data only in these circumstances:
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • With your explicit consent
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • To comply with legal obligations or law enforcement requests
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • To protect our rights, privacy, safety, or property
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • With service providers who assist in app operations (under strict confidentiality agreements)
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            6. Your Rights and Choices
          </Text>
          <Text style={[styles.paragraph, { color: textSecondaryColor }]}>
            You have the right to:
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Access your personal data
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Request data correction or deletion
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Withdraw SMS access consent at any time
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Opt-out of push notifications
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Export your transaction data
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Delete your account and all associated data
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            7. SMS Permissions
          </Text>
          <Text style={[styles.paragraph, { color: textSecondaryColor }]}>
            SMS access is OPTIONAL and requires your explicit consent. You can:
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Enable/disable SMS auto-detection in Settings
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Choose which SMS providers to monitor
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Manually paste SMS messages for analysis instead
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Revoke SMS permissions at any time through device settings
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            8. Data Retention
          </Text>
          <Text style={[styles.paragraph, { color: textSecondaryColor }]}>
            We retain your data for as long as your account is active or as needed to provide services. Transaction data is retained for:
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • 12 months for fraud analysis and reporting
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Longer if required by law or for legal proceedings
          </Text>
          <Text style={[styles.paragraph, { color: textSecondaryColor }]}>
            Upon account deletion, all personal data is permanently removed within 30 days.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            9. Children's Privacy
          </Text>
          <Text style={[styles.paragraph, { color: textSecondaryColor }]}>
            MoMo Analytics is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected data from a child, please contact us immediately.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            10. Changes to This Policy
          </Text>
          <Text style={[styles.paragraph, { color: textSecondaryColor }]}>
            We may update this Privacy Policy from time to time. We will notify you of significant changes via:
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • In-app notification
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Email notification
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Updated "Last Updated" date at the top of this policy
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            11. Contact Us
          </Text>
          <Text style={[styles.paragraph, { color: textSecondaryColor }]}>
            If you have questions about this Privacy Policy or our data practices, please contact us:
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Email: privacy@momoanalytics.com
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • In-App: Settings → Help & Support → Contact Us
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Address: Accra, Ghana
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            12. Compliance
          </Text>
          <Text style={[styles.paragraph, { color: textSecondaryColor }]}>
            MoMo Analytics complies with:
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Ghana Data Protection Act, 2012 (Act 843)
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • General Data Protection Regulation (GDPR) principles
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondaryColor }]}>
            • Mobile Money provider terms and conditions
          </Text>
        </View>

        <View style={[styles.footer, { backgroundColor: cardColor }]}>
          <Text style={[styles.footerText, { color: textSecondaryColor }]}>
            By using MoMo Analytics, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  lastUpdated: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 6,
    paddingLeft: 8,
  },
  footer: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
