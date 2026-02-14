
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  Modal,
  Pressable,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet, authenticatedPut, authenticatedPost } from '@/utils/api';

interface Alert {
  id: string;
  transactionId: string;
  alertLevel: string;
  title: string;
  message: string;
  riskScore: number;
  riskReasons: string[];
  isRead: boolean;
  isDismissed: boolean;
  actionTaken: string | null;
  createdAt: string;
}

export default function AlertsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string | null>(null);

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardColor = isDark ? colors.cardDark : colors.card;

  useEffect(() => {
    console.log('[Alerts] Screen mounted');
    loadAlerts();
  }, [filterLevel]);

  const loadAlerts = async () => {
    console.log('[Alerts] Loading alerts...');
    try {
      const queryParams = new URLSearchParams({
        page: '1',
        limit: '50',
        ...(filterLevel && { level: filterLevel }),
      });

      const response = await authenticatedGet<{
        alerts: Alert[];
        total: number;
        unreadCount: number;
      }>(`/api/alerts/in-app?${queryParams}`);

      console.log('[Alerts] Loaded:', response);
      
      // Handle both array and object responses
      if (Array.isArray(response)) {
        setAlerts(response);
        setUnreadCount(0);
      } else if (response.alerts && Array.isArray(response.alerts)) {
        setAlerts(response.alerts);
        setUnreadCount(response.unreadCount || 0);
      } else {
        console.warn('[Alerts] Unexpected response format:', response);
        setAlerts([]);
        setUnreadCount(0);
      }
    } catch (error: any) {
      console.error('[Alerts] Failed to load alerts:', error);
      
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        console.log('[Alerts] Authentication error - user may need to re-login');
      } else if (error?.message?.includes('Network')) {
        console.log('[Alerts] Network error - showing empty state');
      }
      
      setAlerts([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  };

  const handleAlertPress = async (alert: Alert) => {
    setSelectedAlert(alert);
    setShowDetailModal(true);

    // Mark as read
    if (!alert.isRead) {
      try {
        await authenticatedPut(`/api/alerts/in-app/${alert.id}/read`, {});
        setAlerts(prev =>
          prev.map(a => (a.id === alert.id ? { ...a, isRead: true } : a))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('[Alerts] Failed to mark as read:', error);
      }
    }
  };

  const handleDismiss = async () => {
    if (!selectedAlert) return;

    setActionLoading(true);
    try {
      await authenticatedPut(`/api/alerts/in-app/${selectedAlert.id}/dismiss`, {});
      setAlerts(prev => prev.filter(a => a.id !== selectedAlert.id));
      setShowDetailModal(false);
      console.log('[Alerts] Alert dismissed');
    } catch (error) {
      console.error('[Alerts] Failed to dismiss alert:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (action: 'CONFIRMED_SAFE' | 'BLOCKED' | 'REPORTED') => {
    if (!selectedAlert) return;

    setActionLoading(true);
    try {
      await authenticatedPost(`/api/alerts/in-app/${selectedAlert.id}/action`, { action });
      setAlerts(prev =>
        prev.map(a =>
          a.id === selectedAlert.id ? { ...a, actionTaken: action } : a
        )
      );
      setShowDetailModal(false);
      console.log('[Alerts] Action recorded:', action);
    } catch (error) {
      console.error('[Alerts] Failed to record action:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW':
        return colors.riskLow;
      case 'MEDIUM':
        return colors.riskMedium;
      case 'HIGH':
        return colors.riskHigh;
      case 'CRITICAL':
        return colors.riskCritical;
      default:
        return textSecondaryColor;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      const text = `${diffMins}m ago`;
      return text;
    } else if (diffHours < 24) {
      const text = `${diffHours}h ago`;
      return text;
    } else if (diffDays < 7) {
      const text = `${diffDays}d ago`;
      return text;
    } else {
      const formatted = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      return formatted;
    }
  };

  const filteredAlerts = alerts;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Security Alerts',
            headerShown: true,
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: bgColor },
            headerTintColor: textColor,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: textSecondaryColor }]}>
            Loading alerts...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const unreadText = unreadCount.toString();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Security Alerts',
          headerShown: true,
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: bgColor },
          headerTintColor: textColor,
        }}
      />

      {/* Header Stats */}
      <View style={[styles.header, { backgroundColor: cardColor }]}>
        <View style={styles.statItem}>
          <IconSymbol
            ios_icon_name="bell.badge.fill"
            android_material_icon_name="notifications"
            size={32}
            color={colors.primary}
          />
          <Text style={[styles.statValue, { color: textColor }]}>
            {unreadText}
          </Text>
          <Text style={[styles.statLabel, { color: textSecondaryColor }]}>
            Unread
          </Text>
        </View>

        <View style={styles.statItem}>
          <IconSymbol
            ios_icon_name="shield.fill"
            android_material_icon_name="security"
            size={32}
            color={colors.success}
          />
          <Text style={[styles.statValue, { color: textColor }]}>
            {alerts.length}
          </Text>
          <Text style={[styles.statLabel, { color: textSecondaryColor }]}>
            Total Alerts
          </Text>
        </View>
      </View>

      {/* Filter Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: !filterLevel ? colors.primary : cardColor,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setFilterLevel(null)}
        >
          <Text
            style={[
              styles.filterButtonText,
              { color: !filterLevel ? colors.text : textColor },
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.filterButton,
              {
                backgroundColor: filterLevel === level ? getRiskColor(level) : cardColor,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setFilterLevel(level)}
          >
            <Text
              style={[
                styles.filterButtonText,
                { color: filterLevel === level ? '#fff' : textColor },
              ]}
            >
              {level}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Alerts List */}
      <ScrollView
        style={styles.alertsList}
        contentContainerStyle={styles.alertsContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredAlerts.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: cardColor }]}>
            <IconSymbol
              ios_icon_name="checkmark.shield.fill"
              android_material_icon_name="verified-user"
              size={64}
              color={colors.success}
            />
            <Text style={[styles.emptyText, { color: textColor }]}>
              No alerts
            </Text>
            <Text style={[styles.emptySubtext, { color: textSecondaryColor }]}>
              All clear! No security alerts at this time.
            </Text>
          </View>
        ) : (
          filteredAlerts.map((alert) => {
            const riskColor = getRiskColor(alert.alertLevel);
            const dateText = formatDate(alert.createdAt);
            const hasAction = !!alert.actionTaken;

            return (
              <TouchableOpacity
                key={alert.id}
                style={[
                  styles.alertCard,
                  {
                    backgroundColor: cardColor,
                    borderLeftColor: riskColor,
                    opacity: alert.isRead ? 0.7 : 1,
                  },
                ]}
                onPress={() => handleAlertPress(alert)}
              >
                <View style={styles.alertHeader}>
                  <View style={[styles.alertBadge, { backgroundColor: riskColor }]}>
                    <Text style={styles.alertBadgeText}>
                      {alert.alertLevel}
                    </Text>
                  </View>
                  <Text style={[styles.alertDate, { color: textSecondaryColor }]}>
                    {dateText}
                  </Text>
                </View>

                <Text style={[styles.alertTitle, { color: textColor }]}>
                  {alert.title}
                </Text>
                <Text
                  style={[styles.alertMessage, { color: textSecondaryColor }]}
                  numberOfLines={2}
                >
                  {alert.message}
                </Text>

                <View style={styles.alertFooter}>
                  <View style={styles.alertScore}>
                    <IconSymbol
                      ios_icon_name="exclamationmark.triangle.fill"
                      android_material_icon_name="warning"
                      size={16}
                      color={riskColor}
                    />
                    <Text style={[styles.alertScoreText, { color: textSecondaryColor }]}>
                      Risk: {alert.riskScore}
                    </Text>
                  </View>

                  {!alert.isRead && (
                    <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                  )}

                  {hasAction && (
                    <View style={[styles.actionBadge, { backgroundColor: colors.success }]}>
                      <Text style={styles.actionBadgeText}>
                        {alert.actionTaken}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowDetailModal(false)}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: cardColor }]}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedAlert && (
              <React.Fragment>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: textColor }]}>
                    Alert Details
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowDetailModal(false)}
                    style={styles.closeButton}
                  >
                    <IconSymbol
                      ios_icon_name="xmark.circle.fill"
                      android_material_icon_name="close"
                      size={24}
                      color={textSecondaryColor}
                    />
                  </TouchableOpacity>
                </View>

                <View
                  style={[
                    styles.modalBadge,
                    { backgroundColor: getRiskColor(selectedAlert.alertLevel) },
                  ]}
                >
                  <Text style={styles.modalBadgeText}>
                    {selectedAlert.alertLevel} RISK
                  </Text>
                </View>

                <Text style={[styles.modalAlertTitle, { color: textColor }]}>
                  {selectedAlert.title}
                </Text>
                <Text style={[styles.modalAlertMessage, { color: textSecondaryColor }]}>
                  {selectedAlert.message}
                </Text>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: textColor }]}>
                    Risk Reasons
                  </Text>
                  {selectedAlert.riskReasons.map((reason, index) => (
                    <View key={index} style={styles.reasonItem}>
                      <IconSymbol
                        ios_icon_name="exclamationmark.circle.fill"
                        android_material_icon_name="error"
                        size={16}
                        color={getRiskColor(selectedAlert.alertLevel)}
                      />
                      <Text style={[styles.reasonText, { color: textSecondaryColor }]}>
                        {reason}
                      </Text>
                    </View>
                  ))}
                </View>

                {!selectedAlert.actionTaken && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.success }]}
                      onPress={() => handleAction('CONFIRMED_SAFE')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <React.Fragment>
                          <IconSymbol
                            ios_icon_name="checkmark.circle.fill"
                            android_material_icon_name="check-circle"
                            size={20}
                            color="#fff"
                          />
                          <Text style={styles.actionButtonText}>Safe</Text>
                        </React.Fragment>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.warning }]}
                      onPress={() => handleAction('BLOCKED')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <React.Fragment>
                          <IconSymbol
                            ios_icon_name="hand.raised.fill"
                            android_material_icon_name="block"
                            size={20}
                            color="#fff"
                          />
                          <Text style={styles.actionButtonText}>Block</Text>
                        </React.Fragment>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.error }]}
                      onPress={() => handleAction('REPORTED')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <React.Fragment>
                          <IconSymbol
                            ios_icon_name="exclamationmark.triangle.fill"
                            android_material_icon_name="report"
                            size={20}
                            color="#fff"
                          />
                          <Text style={styles.actionButtonText}>Report</Text>
                        </React.Fragment>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.dismissButton,
                    { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' },
                  ]}
                  onPress={handleDismiss}
                  disabled={actionLoading}
                >
                  <Text style={[styles.dismissButtonText, { color: textColor }]}>
                    Dismiss Alert
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  statItem: {
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
  },
  filterContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  alertsList: {
    flex: 1,
  },
  alertsContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    padding: 48,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  alertCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  alertBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  alertDate: {
    fontSize: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  alertFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  alertScoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modalBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  modalAlertTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalAlertMessage: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  dismissButton: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
