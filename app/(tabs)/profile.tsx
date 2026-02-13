import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, TextInput, ActivityIndicator, useColorScheme, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { GlassView } from "expo-glass-effect";
import { useTheme } from "@react-navigation/native";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, Link } from "expo-router";
import { colors } from "@/styles/commonStyles";

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
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  
  const [settings, setSettings] = useState<UserSettings>({
    dailyLimit: 2000,
    blockedMerchants: [],
    trustedMerchants: [],
    smsReadPreference: 'momo_only',
  });
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dailyLimitInput, setDailyLimitInput] = useState('2000');
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const isDark = colorScheme === 'dark';
  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardColor = isDark ? colors.cardDark : colors.card;

  useEffect(() => {
    loadSettings();
    loadSubscriptionStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const response = await authenticatedGet<UserSettings>('/api/settings');
      console.log('Settings loaded:', response);
      setSettings(response);
      setDailyLimitInput(response.dailyLimit.toString());
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionStatus = async () => {
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const response = await authenticatedGet<SubscriptionStatus>('/api/subscriptions/status');
      console.log('Subscription status loaded:', response);
      setSubscriptionStatus(response);
    } catch (error) {
      console.error('Failed to load subscription status:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { authenticatedPut } = await import('@/utils/api');
      const newLimit = parseFloat(dailyLimitInput);
      if (isNaN(newLimit) || newLimit < 0) {
        console.log('⚠️ Please enter a valid daily limit');
        return;
      }
      
      const response = await authenticatedPut<UserSettings>('/api/settings', {
        dailyLimit: newLimit,
        smsReadPreference: settings.smsReadPreference,
      });
      console.log('Settings saved:', response);
      setSettings(response);
      console.log('✅ Settings saved successfully!');
    } catch (error) {
      console.error('❌ Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setShowSignOutModal(false);
    try {
      await signOut();
      router.replace('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
      // Still navigate to auth even if API call fails
      router.replace('/auth');
    }
  };

  const getSubscriptionBadgeColor = (status: string) => {
    switch (status) {
      case 'trial':
        return colors.warning;
      case 'pro':
      case 'business':
        return colors.success;
      case 'free':
      default:
        return colors.textSecondary;
    }
  };

  const formatDaysRemaining = (days?: number) => {
    if (!days) return '';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: textSecondaryColor }]}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          Platform.OS !== 'ios' && styles.contentContainerWithTabBar
        ]}
      >
        <GlassView style={[
          styles.profileHeader,
          Platform.OS !== 'ios' && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} glassEffectStyle="regular">
          <IconSymbol ios_icon_name="person.circle.fill" android_material_icon_name="person" size={80} color={colors.primary} />
          <Text style={[styles.name, { color: textColor }]}>{user?.fullName || user?.name || 'User'}</Text>
          <Text style={[styles.email, { color: textSecondaryColor }]}>{user?.phoneNumber || user?.email || ''}</Text>
          
          {subscriptionStatus && (
            <View style={styles.subscriptionBadge}>
              <View style={[styles.badge, { backgroundColor: getSubscriptionBadgeColor(subscriptionStatus.subscriptionStatus) }]}>
                <Text style={styles.badgeText}>
                  {subscriptionStatus.currentPlan.toUpperCase()}
                </Text>
              </View>
              {subscriptionStatus.subscriptionStatus === 'trial' && subscriptionStatus.daysRemaining !== undefined && (
                <Text style={[styles.trialText, { color: textSecondaryColor }]}>
                  {formatDaysRemaining(subscriptionStatus.daysRemaining)}
                </Text>
              )}
            </View>
          )}
        </GlassView>

        {subscriptionStatus && subscriptionStatus.subscriptionStatus !== 'business' && (
          <Link href="/upgrade" asChild>
            <TouchableOpacity>
              <GlassView style={[
                styles.upgradeCard,
                Platform.OS !== 'ios' && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
              ]} glassEffectStyle="regular">
                <View style={styles.upgradeContent}>
                  <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={32} color={colors.warning} />
                  <View style={styles.upgradeText}>
                    <Text style={[styles.upgradeTitle, { color: textColor }]}>
                      {subscriptionStatus.subscriptionStatus === 'trial' ? 'Enjoying your trial?' : 'Upgrade to Pro'}
                    </Text>
                    <Text style={[styles.upgradeSubtitle, { color: textSecondaryColor }]}>
                      {subscriptionStatus.subscriptionStatus === 'trial' 
                        ? 'Unlock all features permanently' 
                        : 'Get advanced fraud protection & analytics'}
                    </Text>
                  </View>
                  <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="arrow-forward" size={24} color={textSecondaryColor} />
                </View>
              </GlassView>
            </TouchableOpacity>
          </Link>
        )}

        <GlassView style={[
          styles.section,
          Platform.OS !== 'ios' && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} glassEffectStyle="regular">
          <Text style={[styles.sectionTitle, { color: textColor }]}>Settings</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <IconSymbol ios_icon_name="creditcard.fill" android_material_icon_name="credit-card" size={20} color={textSecondaryColor} />
              <Text style={[styles.settingLabel, { color: textColor }]}>Daily Limit (GHS)</Text>
            </View>
            <TextInput
              style={[styles.input, { color: textColor, borderColor: colors.border }]}
              value={dailyLimitInput}
              onChangeText={setDailyLimitInput}
              keyboardType="numeric"
              placeholder="2000"
              placeholderTextColor={textSecondaryColor}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <IconSymbol ios_icon_name="message.fill" android_material_icon_name="message" size={20} color={textSecondaryColor} />
              <Text style={[styles.settingLabel, { color: textColor }]}>SMS Reading</Text>
            </View>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setSettings({ ...settings, smsReadPreference: 'momo_only' })}
              >
                <View style={[styles.radio, settings.smsReadPreference === 'momo_only' && styles.radioSelected]}>
                  {settings.smsReadPreference === 'momo_only' && (
                    <View style={styles.radioDot} />
                  )}
                </View>
                <Text style={[styles.radioLabel, { color: textColor }]}>MoMo SMS Only</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setSettings({ ...settings, smsReadPreference: 'all' })}
              >
                <View style={[styles.radio, settings.smsReadPreference === 'all' && styles.radioSelected]}>
                  {settings.smsReadPreference === 'all' && (
                    <View style={styles.radioDot} />
                  )}
                </View>
                <Text style={[styles.radioLabel, { color: textColor }]}>All SMS</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={saveSettings}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Settings</Text>
            )}
          </TouchableOpacity>
        </GlassView>

        <GlassView style={[
          styles.section,
          Platform.OS !== 'ios' && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} glassEffectStyle="regular">
          <View style={styles.infoRow}>
            <IconSymbol ios_icon_name="shield.fill" android_material_icon_name="security" size={20} color={textSecondaryColor} />
            <Text style={[styles.infoText, { color: textColor }]}>Blocked Merchants: {settings.blockedMerchants.length}</Text>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol ios_icon_name="checkmark.shield.fill" android_material_icon_name="verified-user" size={20} color={textSecondaryColor} />
            <Text style={[styles.infoText, { color: textColor }]}>Trusted Merchants: {settings.trustedMerchants.length}</Text>
          </View>
        </GlassView>

        <Link href="/privacy-policy" asChild>
          <TouchableOpacity style={[styles.linkButton]}>
            <IconSymbol ios_icon_name="doc.text.fill" android_material_icon_name="description" size={20} color={colors.primary} />
            <Text style={[styles.linkButtonText, { color: colors.primary }]}>Privacy Policy</Text>
          </TouchableOpacity>
        </Link>

        <TouchableOpacity
          style={[styles.signOutButton]}
          onPress={() => setShowSignOutModal(true)}
        >
          <IconSymbol ios_icon_name="arrow.right.square.fill" android_material_icon_name="logout" size={20} color="#fff" />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showSignOutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSignOutModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: cardColor }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Sign Out</Text>
            <Text style={[styles.modalMessage, { color: textSecondaryColor }]}>
              Are you sure you want to sign out?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowSignOutModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: textColor }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleSignOut}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // backgroundColor handled dynamically
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  contentContainer: {
    padding: 20,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100, // Extra padding for floating tab bar
  },
  profileHeader: {
    alignItems: 'center',
    borderRadius: 12,
    padding: 32,
    marginBottom: 16,
    gap: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    // color handled dynamically
  },
  email: {
    fontSize: 16,
    // color handled dynamically
  },
  section: {
    borderRadius: 12,
    padding: 20,
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  settingRow: {
    marginBottom: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  saveButton: {
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#1A1F2E',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    // color handled dynamically
  },
  linkButton: {
    height: 50,
    backgroundColor: 'transparent',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    height: 50,
    backgroundColor: colors.error,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  subscriptionBadge: {
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: '#1A1F2E',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  trialText: {
    fontSize: 14,
    fontWeight: '600',
  },
  upgradeCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upgradeText: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  upgradeSubtitle: {
    fontSize: 14,
  },
  radioGroup: {
    gap: 12,
    marginTop: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioLabel: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.border,
  },
  modalButtonConfirm: {
    backgroundColor: colors.error,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
