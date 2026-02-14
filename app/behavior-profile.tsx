
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet } from '@/utils/api';

interface BehaviorProfile {
  avgTransactionAmount: number;
  typicalTransactionTimes: number[];
  typicalRecipients: string[];
  transactionFrequency: number;
  last30DaysPattern: {
    totalTransactions: number;
    totalSent: number;
    totalReceived: number;
    avgDailyTransactions: number;
  };
  anomalyThreshold: number;
}

export default function BehaviorProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();

  const [profile, setProfile] = useState<BehaviorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardColor = isDark ? colors.cardDark : colors.card;

  useEffect(() => {
    console.log('[Behavior Profile] Screen mounted');
    loadProfile();
  }, []);

  const loadProfile = async () => {
    console.log('[Behavior Profile] Loading profile...');
    try {
      const response = await authenticatedGet<BehaviorProfile>('/api/user-behavior-profile');
      console.log('[Behavior Profile] Profile loaded:', response);
      setProfile(response);
    } catch (error) {
      console.error('[Behavior Profile] Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    const text = `${formattedHour}${ampm}`;
    return text;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Behavior Profile',
            headerShown: true,
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: bgColor },
            headerTintColor: textColor,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: textSecondaryColor }]}>
            Loading behavior profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Behavior Profile',
            headerShown: true,
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: bgColor },
            headerTintColor: textColor,
          }}
        />
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: textColor }]}>
            No profile data available
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const avgAmountText = profile.avgTransactionAmount.toFixed(2);
  const frequencyText = profile.transactionFrequency.toFixed(1);
  const anomalyText = profile.anomalyThreshold.toFixed(0);
  const totalTransactionsText = profile.last30DaysPattern.totalTransactions.toString();
  const totalSentText = profile.last30DaysPattern.totalSent.toFixed(2);
  const totalReceivedText = profile.last30DaysPattern.totalReceived.toFixed(2);
  const avgDailyText = profile.last30DaysPattern.avgDailyTransactions.toFixed(1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Behavior Profile',
          headerShown: true,
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: bgColor },
          headerTintColor: textColor,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: cardColor }]}>
          <IconSymbol
            ios_icon_name="person.badge.shield.checkmark.fill"
            android_material_icon_name="person"
            size={64}
            color={colors.accent}
          />
          <Text style={[styles.headerTitle, { color: textColor }]}>
            Your Behavior Profile
          </Text>
          <Text style={[styles.headerSubtitle, { color: textSecondaryColor }]}>
            AI learns your patterns to detect fraud
          </Text>
        </View>

        {/* Transaction Patterns */}
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Transaction Patterns
          </Text>

          <View style={styles.patternItem}>
            <IconSymbol
              ios_icon_name="dollarsign.circle.fill"
              android_material_icon_name="attach-money"
              size={32}
              color={colors.primary}
            />
            <View style={styles.patternInfo}>
              <Text style={[styles.patternLabel, { color: textSecondaryColor }]}>
                Average Amount
              </Text>
              <Text style={[styles.patternValue, { color: textColor }]}>
                GHS {avgAmountText}
              </Text>
            </View>
          </View>

          <View style={styles.patternItem}>
            <IconSymbol
              ios_icon_name="chart.line.uptrend.xyaxis"
              android_material_icon_name="trending-up"
              size={32}
              color={colors.success}
            />
            <View style={styles.patternInfo}>
              <Text style={[styles.patternLabel, { color: textSecondaryColor }]}>
                Daily Frequency
              </Text>
              <Text style={[styles.patternValue, { color: textColor }]}>
                {frequencyText} transactions/day
              </Text>
            </View>
          </View>

          <View style={styles.patternItem}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={32}
              color={colors.warning}
            />
            <View style={styles.patternInfo}>
              <Text style={[styles.patternLabel, { color: textSecondaryColor }]}>
                Anomaly Threshold
              </Text>
              <Text style={[styles.patternValue, { color: textColor }]}>
                {anomalyText} points
              </Text>
            </View>
          </View>
        </View>

        {/* Typical Transaction Times */}
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Typical Transaction Times
          </Text>
          <Text style={[styles.cardSubtitle, { color: textSecondaryColor }]}>
            Hours when you usually transact
          </Text>

          <View style={styles.timeGrid}>
            {profile.typicalTransactionTimes.length > 0 ? (
              profile.typicalTransactionTimes.map((hour) => {
                const hourText = formatHour(hour);
                return (
                  <View
                    key={hour}
                    style={[styles.timeChip, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.timeChipText}>
                      {hourText}
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text style={[styles.emptyText, { color: textSecondaryColor }]}>
                No typical times yet
              </Text>
            )}
          </View>
        </View>

        {/* Typical Recipients */}
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Frequent Recipients
          </Text>
          <Text style={[styles.cardSubtitle, { color: textSecondaryColor }]}>
            People you transact with often
          </Text>

          {profile.typicalRecipients.length > 0 ? (
            profile.typicalRecipients.map((recipient, index) => (
              <View key={index} style={styles.recipientItem}>
                <IconSymbol
                  ios_icon_name="person.circle.fill"
                  android_material_icon_name="account-circle"
                  size={24}
                  color={colors.accent}
                />
                <Text style={[styles.recipientText, { color: textColor }]}>
                  {recipient}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: textSecondaryColor }]}>
              No frequent recipients yet
            </Text>
          )}
        </View>

        {/* 30-Day Summary */}
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Last 30 Days
          </Text>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: textColor }]}>
                {totalTransactionsText}
              </Text>
              <Text style={[styles.summaryLabel, { color: textSecondaryColor }]}>
                Transactions
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: textColor }]}>
                GHS {totalSentText}
              </Text>
              <Text style={[styles.summaryLabel, { color: textSecondaryColor }]}>
                Sent
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: textColor }]}>
                GHS {totalReceivedText}
              </Text>
              <Text style={[styles.summaryLabel, { color: textSecondaryColor }]}>
                Received
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: textColor }]}>
                {avgDailyText}
              </Text>
              <Text style={[styles.summaryLabel, { color: textSecondaryColor }]}>
                Avg/Day
              </Text>
            </View>
          </View>
        </View>

        {/* Info Box */}
        <View
          style={[
            styles.infoBox,
            { backgroundColor: isDark ? '#1a3a52' : '#e3f2fd' },
          ]}
        >
          <IconSymbol
            ios_icon_name="info.circle.fill"
            android_material_icon_name="info"
            size={24}
            color={colors.primary}
          />
          <Text style={[styles.infoText, { color: textColor }]}>
            Your behavior profile is continuously updated to improve fraud detection accuracy. The AI learns your normal patterns to identify suspicious activity.
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  patternItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 16,
  },
  patternInfo: {
    flex: 1,
  },
  patternLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  patternValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  recipientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  recipientText: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
  },
  infoBox: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
