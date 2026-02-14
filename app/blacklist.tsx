
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
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet, authenticatedPost, authenticatedDelete } from '@/utils/api';

interface BlacklistEntry {
  id: string;
  recipientIdentifier: string;
  blacklistType: string;
  reason: string;
  riskLevel: string;
  reportedCount: number;
  createdAt: string;
}

export default function BlacklistScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();

  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');
  const [newReason, setNewReason] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardColor = isDark ? colors.cardDark : colors.card;

  useEffect(() => {
    console.log('[Blacklist] Screen mounted');
    loadBlacklist();
  }, []);

  const loadBlacklist = async () => {
    console.log('[Blacklist] Loading blacklist...');
    try {
      const response = await authenticatedGet<{ blacklist: BlacklistEntry[] }>('/api/recipient-blacklist');
      console.log('[Blacklist] Loaded:', response);
      setBlacklist(response.blacklist);
    } catch (error) {
      console.error('[Blacklist] Failed to load blacklist:', error);
      setBlacklist([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBlacklist();
    setRefreshing(false);
  };

  const handleAddRecipient = async () => {
    if (!newRecipient.trim() || !newReason.trim()) {
      console.log('[Blacklist] Missing recipient or reason');
      return;
    }

    setAddLoading(true);
    try {
      const response = await authenticatedPost<{ success: boolean; blacklistEntry: BlacklistEntry }>(
        '/api/recipient-blacklist',
        {
          recipientIdentifier: newRecipient.trim(),
          reason: newReason.trim(),
        }
      );

      console.log('[Blacklist] Recipient added:', response);
      setBlacklist(prev => [...prev, response.blacklistEntry]);
      setShowAddModal(false);
      setNewRecipient('');
      setNewReason('');
    } catch (error) {
      console.error('[Blacklist] Failed to add recipient:', error);
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveRecipient = async (entry: BlacklistEntry) => {
    if (entry.blacklistType === 'GLOBAL') {
      console.log('[Blacklist] Cannot remove global blacklist entry');
      return;
    }

    console.log('[Blacklist] Removing recipient:', entry.id);
    try {
      await authenticatedDelete(`/api/recipient-blacklist/${entry.id}`, {});
      setBlacklist(prev => prev.filter(e => e.id !== entry.id));
      console.log('[Blacklist] Recipient removed');
    } catch (error) {
      console.error('[Blacklist] Failed to remove recipient:', error);
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Blacklist',
            headerShown: true,
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: bgColor },
            headerTintColor: textColor,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: textSecondaryColor }]}>
            Loading blacklist...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const userBlacklist = blacklist.filter(e => e.blacklistType === 'USER_SPECIFIC');
  const globalBlacklist = blacklist.filter(e => e.blacklistType === 'GLOBAL');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Blacklist',
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
            ios_icon_name="hand.raised.fill"
            android_material_icon_name="block"
            size={64}
            color={colors.error}
          />
          <Text style={[styles.headerTitle, { color: textColor }]}>
            Blocked Recipients
          </Text>
          <Text style={[styles.headerSubtitle, { color: textSecondaryColor }]}>
            Manage blocked merchants and recipients
          </Text>
        </View>

        {/* Add Button */}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <IconSymbol
            ios_icon_name="plus.circle.fill"
            android_material_icon_name="add-circle"
            size={24}
            color={colors.text}
          />
          <Text style={[styles.addButtonText, { color: colors.text }]}>
            Add to Blacklist
          </Text>
        </TouchableOpacity>

        {/* User Blacklist */}
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Your Blacklist
          </Text>
          <Text style={[styles.cardSubtitle, { color: textSecondaryColor }]}>
            Recipients you've blocked
          </Text>

          {userBlacklist.length === 0 ? (
            <Text style={[styles.emptyText, { color: textSecondaryColor }]}>
              No blocked recipients
            </Text>
          ) : (
            userBlacklist.map((entry) => {
              const riskColor = getRiskColor(entry.riskLevel);

              return (
                <View key={entry.id} style={styles.blacklistItem}>
                  <View style={styles.blacklistInfo}>
                    <Text style={[styles.recipientName, { color: textColor }]}>
                      {entry.recipientIdentifier}
                    </Text>
                    <Text style={[styles.blacklistReason, { color: textSecondaryColor }]}>
                      {entry.reason}
                    </Text>
                    <View style={[styles.riskBadge, { backgroundColor: riskColor }]}>
                      <Text style={styles.riskBadgeText}>
                        {entry.riskLevel}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.removeButton, { backgroundColor: colors.error }]}
                    onPress={() => handleRemoveRecipient(entry)}
                  >
                    <IconSymbol
                      ios_icon_name="trash.fill"
                      android_material_icon_name="delete"
                      size={20}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* Global Blacklist */}
        {globalBlacklist.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardColor }]}>
            <Text style={[styles.cardTitle, { color: textColor }]}>
              Global Blacklist
            </Text>
            <Text style={[styles.cardSubtitle, { color: textSecondaryColor }]}>
              Known fraudulent recipients
            </Text>

            {globalBlacklist.map((entry) => {
              const riskColor = getRiskColor(entry.riskLevel);
              const reportedText = entry.reportedCount.toString();

              return (
                <View key={entry.id} style={styles.blacklistItem}>
                  <View style={styles.blacklistInfo}>
                    <Text style={[styles.recipientName, { color: textColor }]}>
                      {entry.recipientIdentifier}
                    </Text>
                    <Text style={[styles.blacklistReason, { color: textSecondaryColor }]}>
                      {entry.reason}
                    </Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.riskBadge, { backgroundColor: riskColor }]}>
                        <Text style={styles.riskBadgeText}>
                          {entry.riskLevel}
                        </Text>
                      </View>
                      <View style={[styles.reportBadge, { backgroundColor: colors.warning }]}>
                        <Text style={styles.reportBadgeText}>
                          {reportedText} reports
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.globalBadge, { backgroundColor: colors.accent }]}>
                    <IconSymbol
                      ios_icon_name="globe"
                      android_material_icon_name="public"
                      size={20}
                      color="#fff"
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

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
            Transactions to blacklisted recipients will be flagged with high risk scores. Global blacklist entries are shared across all users for community protection.
          </Text>
        </View>
      </ScrollView>

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: cardColor }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                Add to Blacklist
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
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

            <Text style={[styles.inputLabel, { color: textSecondaryColor }]}>
              Recipient (Phone/Name/Merchant ID)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? colors.backgroundDark : '#f5f5f5',
                  color: textColor,
                  borderColor: colors.border,
                },
              ]}
              value={newRecipient}
              onChangeText={setNewRecipient}
              placeholder="e.g., 0241234567 or John Doe"
              placeholderTextColor={textSecondaryColor}
            />

            <Text style={[styles.inputLabel, { color: textSecondaryColor }]}>
              Reason
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: isDark ? colors.backgroundDark : '#f5f5f5',
                  color: textColor,
                  borderColor: colors.border,
                },
              ]}
              value={newReason}
              onChangeText={setNewReason}
              placeholder="Why are you blocking this recipient?"
              placeholderTextColor={textSecondaryColor}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: newRecipient.trim() && newReason.trim() ? colors.primary : colors.border,
                },
              ]}
              onPress={handleAddRecipient}
              disabled={!newRecipient.trim() || !newReason.trim() || addLoading}
            >
              {addLoading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <React.Fragment>
                  <IconSymbol
                    ios_icon_name="hand.raised.fill"
                    android_material_icon_name="block"
                    size={24}
                    color={colors.text}
                  />
                  <Text style={[styles.submitButtonText, { color: colors.text }]}>
                    Add to Blacklist
                  </Text>
                </React.Fragment>
              )}
            </TouchableOpacity>
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
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
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  blacklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  blacklistInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  blacklistReason: {
    fontSize: 14,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  reportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reportBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  globalBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
