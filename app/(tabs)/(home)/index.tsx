
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet } from '@/utils/api';

interface LayerPerformance {
  layer: number;
  layerName: string;
  passRate: number;
  avgProcessingTime: number;
}

interface DashboardData {
  totalTransactions: number;
  fraudDetected: number;
  moneyProtected: number;
  alertsGenerated: number;
  layerPerformance: LayerPerformance[];
  recentAlerts: any[];
  riskDistribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
}

export default function SecurityDashboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardColor = isDark ? colors.cardDark : colors.card;

  useEffect(() => {
    console.log('[Security Dashboard] Screen mounted');
    if (!authLoading && !user) {
      console.log('No user found, redirecting to auth');
      router.replace('/auth');
    } else if (user) {
      console.log('User authenticated, loading dashboard');
      loadDashboard();
    }
  }, [user, authLoading]);

  const loadDashboard = async () => {
    console.log('[Security Dashboard] Loading data...');
    setError(null);
    try {
      const response = await authenticatedGet<DashboardData>('/api/dashboard/security-overview');
      console.log('[Security Dashboard] Data loaded:', response);
      
      // Validate response structure
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response from server');
      }
      
      // Ensure all required fields exist with defaults
      const validatedData: DashboardData = {
        totalTransactions: response.totalTransactions || 0,
        fraudDetected: response.fraudDetected || 0,
        moneyProtected: response.moneyProtected || 0,
        alertsGenerated: response.alertsGenerated || 0,
        layerPerformance: Array.isArray(response.layerPerformance) ? response.layerPerformance : [],
        recentAlerts: Array.isArray(response.recentAlerts) ? response.recentAlerts : [],
        riskDistribution: {
          LOW: response.riskDistribution?.LOW || 0,
          MEDIUM: response.riskDistribution?.MEDIUM || 0,
          HIGH: response.riskDistribution?.HIGH || 0,
          CRITICAL: response.riskDistribution?.CRITICAL || 0,
        },
      };
      
      setData(validatedData);
    } catch (err: any) {
      console.error('[Security Dashboard] Failed to load data:', err);
      const errorMessage = err?.message || 'Failed to load dashboard data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };



  if (authLoading || loading) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: '7-Layer Security',
            headerStyle: { backgroundColor: bgColor },
            headerTintColor: textColor,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: textSecondaryColor }]}>
            Loading security dashboard...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: '7-Layer Security',
            headerStyle: { backgroundColor: bgColor },
            headerTintColor: textColor,
          }}
        />
        <View style={styles.loadingContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={64}
            color={colors.warning}
          />
          <Text style={[styles.errorText, { color: textColor }]}>
            {error || 'Failed to load dashboard'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={loadDashboard}
          >
            <Text style={[styles.retryButtonText, { color: colors.text }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const totalTransactionsText = data.totalTransactions.toString();
  const fraudDetectedText = data.fraudDetected.toString();
  const moneyProtectedText = data.moneyProtected.toFixed(2);
  const alertsGeneratedText = data.alertsGenerated.toString();

  const totalRisk = data.riskDistribution.LOW + data.riskDistribution.MEDIUM + data.riskDistribution.HIGH + data.riskDistribution.CRITICAL;
  const lowPercent = totalRisk > 0 ? ((data.riskDistribution.LOW / totalRisk) * 100).toFixed(0) : '0';
  const mediumPercent = totalRisk > 0 ? ((data.riskDistribution.MEDIUM / totalRisk) * 100).toFixed(0) : '0';
  const highPercent = totalRisk > 0 ? ((data.riskDistribution.HIGH / totalRisk) * 100).toFixed(0) : '0';
  const criticalPercent = totalRisk > 0 ? ((data.riskDistribution.CRITICAL / totalRisk) * 100).toFixed(0) : '0';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '7-Layer Security',
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
            ios_icon_name="shield.checkered"
            android_material_icon_name="security"
            size={64}
            color={colors.primary}
          />
          <Text style={[styles.headerTitle, { color: textColor }]}>
            7-Layer Security Framework
          </Text>
          <Text style={[styles.headerSubtitle, { color: textSecondaryColor }]}>
            Real-time fraud detection and prevention
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: cardColor }]}>
            <IconSymbol
              ios_icon_name="chart.bar.fill"
              android_material_icon_name="bar-chart"
              size={32}
              color={colors.primary}
            />
            <Text style={[styles.statValue, { color: textColor }]}>
              {totalTransactionsText}
            </Text>
            <Text style={[styles.statLabel, { color: textSecondaryColor }]}>
              Transactions
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: cardColor }]}>
            <IconSymbol
              ios_icon_name="exclamationmark.shield.fill"
              android_material_icon_name="warning"
              size={32}
              color={colors.error}
            />
            <Text style={[styles.statValue, { color: textColor }]}>
              {fraudDetectedText}
            </Text>
            <Text style={[styles.statLabel, { color: textSecondaryColor }]}>
              Fraud Detected
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: cardColor }]}>
            <IconSymbol
              ios_icon_name="shield.checkmark.fill"
              android_material_icon_name="verified-user"
              size={32}
              color={colors.success}
            />
            <Text style={[styles.statValue, { color: textColor }]}>
              GHS {moneyProtectedText}
            </Text>
            <Text style={[styles.statLabel, { color: textSecondaryColor }]}>
              Protected
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: cardColor }]}>
            <IconSymbol
              ios_icon_name="bell.badge.fill"
              android_material_icon_name="notifications"
              size={32}
              color={colors.warning}
            />
            <Text style={[styles.statValue, { color: textColor }]}>
              {alertsGeneratedText}
            </Text>
            <Text style={[styles.statLabel, { color: textSecondaryColor }]}>
              Alerts
            </Text>
          </View>
        </View>

        {/* Risk Distribution */}
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Risk Distribution
          </Text>

          {totalRisk > 0 ? (
            <React.Fragment>
              <View style={styles.riskBar}>
                {data.riskDistribution.LOW > 0 && (
                  <View
                    style={[
                      styles.riskSegment,
                      {
                        backgroundColor: colors.riskLow,
                        flex: data.riskDistribution.LOW,
                      },
                    ]}
                  />
                )}
                {data.riskDistribution.MEDIUM > 0 && (
                  <View
                    style={[
                      styles.riskSegment,
                      {
                        backgroundColor: colors.riskMedium,
                        flex: data.riskDistribution.MEDIUM,
                      },
                    ]}
                  />
                )}
                {data.riskDistribution.HIGH > 0 && (
                  <View
                    style={[
                      styles.riskSegment,
                      {
                        backgroundColor: colors.riskHigh,
                        flex: data.riskDistribution.HIGH,
                      },
                    ]}
                  />
                )}
                {data.riskDistribution.CRITICAL > 0 && (
                  <View
                    style={[
                      styles.riskSegment,
                      {
                        backgroundColor: colors.riskCritical,
                        flex: data.riskDistribution.CRITICAL,
                      },
                    ]}
                  />
                )}
              </View>

              <View style={styles.riskLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.riskLow }]} />
                  <Text style={[styles.legendText, { color: textSecondaryColor }]}>
                    Low ({lowPercent}%)
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.riskMedium }]} />
                  <Text style={[styles.legendText, { color: textSecondaryColor }]}>
                    Medium ({mediumPercent}%)
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.riskHigh }]} />
                  <Text style={[styles.legendText, { color: textSecondaryColor }]}>
                    High ({highPercent}%)
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.riskCritical }]} />
                  <Text style={[styles.legendText, { color: textSecondaryColor }]}>
                    Critical ({criticalPercent}%)
                  </Text>
                </View>
              </View>
            </React.Fragment>
          ) : (
            <Text style={[styles.noDataText, { color: textSecondaryColor }]}>
              No risk data available yet. Start analyzing transactions to see risk distribution.
            </Text>
          )}
        </View>

        {/* Layer Performance */}
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Layer Performance
          </Text>
          <Text style={[styles.cardSubtitle, { color: textSecondaryColor }]}>
            7-layer security analysis
          </Text>

          {data.layerPerformance.length > 0 ? (
            <React.Fragment>
              {data.layerPerformance.map((layer) => {
                const passRateText = layer.passRate.toFixed(1);
                const processingTimeText = layer.avgProcessingTime.toFixed(0);

                return (
                  <View key={layer.layer} style={styles.layerItem}>
                    <View style={styles.layerHeader}>
                      <View style={styles.layerInfo}>
                        <View style={[styles.layerNumber, { backgroundColor: colors.primary }]}>
                          <Text style={styles.layerNumberText}>
                            {layer.layer}
                          </Text>
                        </View>
                        <Text style={[styles.layerName, { color: textColor }]}>
                          {layer.layerName}
                        </Text>
                      </View>
                      <Text style={[styles.layerTime, { color: textSecondaryColor }]}>
                        {processingTimeText}ms
                      </Text>
                    </View>

                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${layer.passRate}%`,
                            backgroundColor: layer.passRate >= 90 ? colors.success : layer.passRate >= 70 ? colors.warning : colors.error,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.passRateText, { color: textSecondaryColor }]}>
                      {passRateText}% pass rate
                    </Text>
                  </View>
                );
              })}
            </React.Fragment>
          ) : (
            <Text style={[styles.noDataText, { color: textSecondaryColor }]}>
              No layer performance data available yet. Analyze transactions to see layer metrics.
            </Text>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: cardColor }]}
            onPress={() => router.push('/alerts')}
          >
            <IconSymbol
              ios_icon_name="bell.badge.fill"
              android_material_icon_name="notifications"
              size={32}
              color={colors.warning}
            />
            <Text style={[styles.actionText, { color: textColor }]}>
              View Alerts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: cardColor }]}
            onPress={() => router.push('/chatbot')}
          >
            <IconSymbol
              ios_icon_name="message.badge.fill"
              android_material_icon_name="chat"
              size={32}
              color={colors.primary}
            />
            <Text style={[styles.actionText, { color: textColor }]}>
              AI Chatbot
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: cardColor }]}
            onPress={() => router.push('/blacklist')}
          >
            <IconSymbol
              ios_icon_name="hand.raised.fill"
              android_material_icon_name="block"
              size={32}
              color={colors.error}
            />
            <Text style={[styles.actionText, { color: textColor }]}>
              Blacklist
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
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
  noDataText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  riskBar: {
    flexDirection: 'row',
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  riskSegment: {
    height: '100%',
  },
  riskLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
  },
  layerItem: {
    marginBottom: 20,
  },
  layerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  layerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  layerNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  layerNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  layerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  layerTime: {
    fontSize: 14,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  passRateText: {
    fontSize: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
