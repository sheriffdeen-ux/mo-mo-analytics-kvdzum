import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, TextInput, ActivityIndicator, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { GlassView } from "expo-glass-effect";
import { useTheme } from "@react-navigation/native";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { colors } from "@/styles/commonStyles";

interface UserSettings {
  dailyLimit: number;
  blockedMerchants: string[];
  trustedMerchants: string[];
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
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dailyLimitInput, setDailyLimitInput] = useState('2000');

  const isDark = colorScheme === 'dark';
  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardColor = isDark ? colors.cardDark : colors.card;

  useEffect(() => {
    loadSettings();
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
    try {
      await signOut();
      router.replace('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
      // Still navigate to auth even if API call fails
      router.replace('/auth');
    }
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
          <Text style={[styles.name, { color: textColor }]}>{user?.name || 'User'}</Text>
          <Text style={[styles.email, { color: textSecondaryColor }]}>{user?.email || 'user@example.com'}</Text>
        </GlassView>

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

        <TouchableOpacity
          style={[styles.signOutButton]}
          onPress={handleSignOut}
        >
          <IconSymbol ios_icon_name="arrow.right.square.fill" android_material_icon_name="logout" size={20} color="#fff" />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
});
