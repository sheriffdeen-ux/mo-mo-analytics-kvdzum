
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet, authenticatedPost, authenticatedPut } from '@/utils/api';

interface ImportStats {
  totalImports: number;
  lastImportAt: string | null;
  transactionsImported: number;
  averageRiskScore?: number;
}

interface StructuredTransaction {
  senderId: string;
  amount: number;
  type: 'credit' | 'debit' | 'cash_out' | 'airtime' | 'bill_payment';
  reference: string;
  timestamp: string;
  recipient?: string;
  balance?: number;
  fee?: number;
  tax?: number;
}

export default function SMSImportScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [smsImportEnabled, setSmsImportEnabled] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats>({
    totalImports: 0,
    lastImportAt: null,
    transactionsImported: 0,
  });
  const [importResult, setImportResult] = useState<{
    imported: number;
    failed: number;
    transactions: Array<{ id: string; riskLevel: string; riskScore: number }>;
  } | null>(null);

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardColor = isDark ? colors.cardDark : colors.card;

  useEffect(() => {
    console.log('[SMS Import] Screen mounted');
    loadImportStats();
    checkPermissionStatus();
  }, []);

  const loadImportStats = async () => {
    console.log('[SMS Import] Loading import stats...');
    try {
      const data = await authenticatedGet<ImportStats>('/api/transactions/import-stats');
      if (data) {
        setImportStats(data);
        console.log('[SMS Import] Stats loaded:', data);
      }
    } catch (error) {
      console.error('[SMS Import] Failed to load stats:', error);
    }
  };

  const checkPermissionStatus = async () => {
    if (Platform.OS === 'web') {
      setHasPermission(false);
      return;
    }

    console.log('[SMS Import] Checking SMS permission status...');
    setHasPermission(false);
  };

  const handleEnableImport = () => {
    console.log('[SMS Import] User tapped Enable Import');
    setShowExplanationModal(true);
  };

  const handleRequestPermission = async () => {
    console.log('[SMS Import] Requesting READ_SMS permission...');
    setShowExplanationModal(false);
    setLoading(true);

    try {
      if (Platform.OS === 'web') {
        alert('SMS import is only available on Android devices.');
        setLoading(false);
        return;
      }

      // TODO: Implement actual Android SMS permission request
      // For now, we'll simulate permission granted
      console.log('[SMS Import] Permission granted (simulated for now)');
      setHasPermission(true);
      setSmsImportEnabled(true);

      // Update user settings on backend using the correct endpoint
      await authenticatedPut('/api/settings', {
        smsImportEnabled: true,
      });

      console.log('[SMS Import] Settings updated on backend');
    } catch (error) {
      console.error('[SMS Import] Failed to enable SMS import:', error);
      alert('Failed to enable SMS import. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportTransactions = async () => {
    console.log('[SMS Import] User triggered transaction import');

    if (!hasPermission) {
      console.log('[SMS Import] No permission, showing explanation');
      setShowExplanationModal(true);
      return;
    }

    setImporting(true);

    try {
      console.log('[SMS Import] Scanning SMS inbox for MoMo messages...');

      const mockTransactions: StructuredTransaction[] = [
        {
          senderId: 'MTN MoMo',
          amount: 50.0,
          type: 'credit',
          reference: 'TX' + Date.now(),
          timestamp: new Date().toISOString(),
          balance: 150.0,
        },
        {
          senderId: 'Vodafone Cash',
          amount: 25.0,
          type: 'debit',
          reference: 'TX' + (Date.now() + 1),
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          recipient: '0241234567',
          balance: 100.0,
          fee: 0.5,
        },
      ];

      console.log('[SMS Import] Found', mockTransactions.length, 'MoMo transactions');
      console.log('[SMS Import] Sending structured data to backend...');

      const result = await authenticatedPost<{
        success: boolean;
        imported: number;
        failed: number;
        transactions: Array<{ id: string; riskLevel: string; riskScore: number }>;
      }>('/api/transactions/import-batch', {
        transactions: mockTransactions,
      });

      console.log('[SMS Import] Import complete:', result);
      setImportResult(result);
      setShowResultModal(true);

      await loadImportStats();
    } catch (error) {
      console.error('[SMS Import] Import failed:', error);
      alert('Failed to import transactions. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const handleDisableImport = async () => {
    console.log('[SMS Import] User disabled SMS import');
    setLoading(true);

    try {
      // Update user settings on backend using the correct endpoint
      await authenticatedPut('/api/settings', {
        smsImportEnabled: false,
      });

      setSmsImportEnabled(false);
      setHasPermission(false);
      console.log('[SMS Import] SMS import disabled');
    } catch (error) {
      console.error('[SMS Import] Failed to disable SMS import:', error);
      alert('Failed to disable SMS import. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const lastSyncedText = formatDate(importStats.lastImportAt);
  const totalImportsText = importStats.totalImports.toString();
  const transactionsImportedText = importStats.transactionsImported.toString();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Import Transactions',
          headerShown: true,
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: bgColor },
          headerTintColor: textColor,
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.headerCard, { backgroundColor: cardColor }]}>
          <IconSymbol
            ios_icon_name="arrow.down.doc.fill"
            android_material_icon_name="file-download"
            size={64}
            color={colors.primary}
          />
          <Text style={[styles.headerTitle, { color: textColor }]}>
            User-Triggered Import
          </Text>
          <Text style={[styles.headerSubtitle, { color: textSecondaryColor }]}>
            You control when we scan your SMS
          </Text>
        </View>

        {!hasPermission ? (
          <React.Fragment>
            <View style={[styles.card, { backgroundColor: cardColor }]}>
              <Text style={[styles.cardTitle, { color: textColor }]}>
                How It Works
              </Text>

              <View style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={styles.stepTextContainer}>
                  <Text style={[styles.stepTitle, { color: textColor }]}>
                    You Press Import
                  </Text>
                  <Text style={[styles.stepText, { color: textSecondaryColor }]}>
                    No automatic scanning. You decide when.
                  </Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepTextContainer}>
                  <Text style={[styles.stepTitle, { color: textColor }]}>
                    We Scan MoMo SMS Only
                  </Text>
                  <Text style={[styles.stepText, { color: textSecondaryColor }]}>
                    Only MTN, Vodafone, Telecel messages. No personal chats.
                  </Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepTextContainer}>
                  <Text style={[styles.stepTitle, { color: textColor }]}>
                    Structured Data Only
                  </Text>
                  <Text style={[styles.stepText, { color: textSecondaryColor }]}>
                    We extract amount, date, type. Never store raw SMS.
                  </Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>4</Text>
                </View>
                <View style={styles.stepTextContainer}>
                  <Text style={[styles.stepTitle, { color: textColor }]}>
                    Fraud Analysis
                  </Text>
                  <Text style={[styles.stepText, { color: textSecondaryColor }]}>
                    7-layer security checks each transaction for fraud.
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.enableButton, { backgroundColor: colors.primary }]}
              onPress={handleEnableImport}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <React.Fragment>
                  <IconSymbol
                    ios_icon_name="checkmark.shield.fill"
                    android_material_icon_name="verified-user"
                    size={24}
                    color="#fff"
                  />
                  <Text style={styles.enableButtonText}>
                    Enable Transaction Import
                  </Text>
                </React.Fragment>
              )}
            </TouchableOpacity>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <View style={[styles.syncCard, { backgroundColor: cardColor }]}>
              <View style={styles.syncHeader}>
                <IconSymbol
                  ios_icon_name="clock.fill"
                  android_material_icon_name="schedule"
                  size={32}
                  color={colors.primary}
                />
                <View style={styles.syncTextContainer}>
                  <Text style={[styles.syncLabel, { color: textSecondaryColor }]}>
                    Last synced
                  </Text>
                  <Text style={[styles.syncValue, { color: textColor }]}>
                    {lastSyncedText}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.importButton, { backgroundColor: colors.primary }]}
                onPress={handleImportTransactions}
                disabled={importing}
              >
                {importing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <React.Fragment>
                    <IconSymbol
                      ios_icon_name="arrow.down.circle.fill"
                      android_material_icon_name="download"
                      size={24}
                      color="#fff"
                    />
                    <Text style={styles.importButtonText}>
                      Import New Transactions
                    </Text>
                  </React.Fragment>
                )}
              </TouchableOpacity>
            </View>

            <View style={[styles.card, { backgroundColor: cardColor }]}>
              <Text style={[styles.cardTitle, { color: textColor }]}>
                Import Statistics
              </Text>

              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: textSecondaryColor }]}>
                  Total Imports
                </Text>
                <Text style={[styles.statValue, { color: textColor }]}>
                  {totalImportsText}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: textSecondaryColor }]}>
                  Transactions Imported
                </Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {transactionsImportedText}
                </Text>
              </View>

              {importStats.averageRiskScore !== undefined && (
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: textSecondaryColor }]}>
                    Average Risk Score
                  </Text>
                  <Text style={[styles.statValue, { color: textColor }]}>
                    {importStats.averageRiskScore.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.card, { backgroundColor: cardColor }]}>
              <Text style={[styles.cardTitle, { color: textColor }]}>
                Privacy Controls
              </Text>

              <TouchableOpacity
                style={styles.privacyItem}
                onPress={() => router.push('/privacy-policy')}
              >
                <IconSymbol
                  ios_icon_name="hand.raised.fill"
                  android_material_icon_name="security"
                  size={24}
                  color={colors.primary}
                />
                <View style={styles.privacyTextContainer}>
                  <Text style={[styles.privacyTitle, { color: textColor }]}>
                    Privacy Policy
                  </Text>
                  <Text style={[styles.privacyText, { color: textSecondaryColor }]}>
                    How we protect your data
                  </Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color={textSecondaryColor}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.disableButton}
                onPress={handleDisableImport}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.error} />
                ) : (
                  <React.Fragment>
                    <IconSymbol
                      ios_icon_name="xmark.circle.fill"
                      android_material_icon_name="cancel"
                      size={20}
                      color={colors.error}
                    />
                    <Text style={[styles.disableButtonText, { color: colors.error }]}>
                      Disable SMS Import
                    </Text>
                  </React.Fragment>
                )}
              </TouchableOpacity>
            </View>
          </React.Fragment>
        )}

        <View style={[styles.guaranteeCard, { backgroundColor: cardColor, borderColor: colors.primary }]}>
          <IconSymbol
            ios_icon_name="checkmark.seal.fill"
            android_material_icon_name="verified"
            size={48}
            color={colors.primary}
          />
          <Text style={[styles.guaranteeTitle, { color: textColor }]}>
            Our Guarantee
          </Text>
          <Text style={[styles.guaranteeText, { color: textSecondaryColor }]}>
            • No background monitoring
          </Text>
          <Text style={[styles.guaranteeText, { color: textSecondaryColor }]}>
            • No automatic forwarding
          </Text>
          <Text style={[styles.guaranteeText, { color: textSecondaryColor }]}>
            • Only MoMo SMS processed
          </Text>
          <Text style={[styles.guaranteeText, { color: textSecondaryColor }]}>
            • Raw SMS never stored
          </Text>
          <Text style={[styles.guaranteeText, { color: textSecondaryColor }]}>
            • You control everything
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showExplanationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExplanationModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowExplanationModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: cardColor }]} onStartShouldSetResponder={() => true}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={64}
              color={colors.primary}
            />
            <Text style={[styles.modalTitle, { color: textColor }]}>
              SMS Permission Needed
            </Text>
            <Text style={[styles.modalText, { color: textSecondaryColor }]}>
              We need READ_SMS permission to scan your Mobile Money messages when you tap Import.
            </Text>
            <Text style={[styles.modalText, { color: textSecondaryColor }]}>
              • We scan only when you request it
            </Text>
            <Text style={[styles.modalText, { color: textSecondaryColor }]}>
              • We do not access personal conversations
            </Text>
            <Text style={[styles.modalText, { color: textSecondaryColor }]}>
              • You can disable this anytime
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleRequestPermission}
              >
                <Text style={styles.modalButtonText}>Grant Permission</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: isDark ? colors.cardDark : '#f0f0f0' }]}
                onPress={() => setShowExplanationModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: textColor }]}>
                  Not Now
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showResultModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResultModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowResultModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: cardColor }]} onStartShouldSetResponder={() => true}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={64}
              color={colors.success}
            />
            <Text style={[styles.modalTitle, { color: textColor }]}>
              Import Complete
            </Text>
            {importResult && (
              <React.Fragment>
                <Text style={[styles.modalText, { color: textSecondaryColor }]}>
                  Successfully imported {importResult.imported} transaction{importResult.imported !== 1 ? 's' : ''}
                </Text>
                {importResult.failed > 0 && (
                  <Text style={[styles.modalText, { color: colors.warning }]}>
                    {importResult.failed} transaction{importResult.failed !== 1 ? 's' : ''} failed validation
                  </Text>
                )}
              </React.Fragment>
            )}

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary, width: '100%' }]}
              onPress={() => {
                setShowResultModal(false);
                router.push('/(tabs)/(home)/');
              }}
            >
              <Text style={styles.modalButtonText}>View Dashboard</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  stepTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 20,
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  enableButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  syncCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  syncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  syncTextContainer: {
    flex: 1,
  },
  syncLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  syncValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statLabel: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 14,
  },
  disableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 16,
    gap: 8,
  },
  disableButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  guaranteeCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 16,
  },
  guaranteeTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  guaranteeText: {
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
    marginTop: 16,
  },
  modalButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
