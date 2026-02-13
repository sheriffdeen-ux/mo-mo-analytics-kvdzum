
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
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

interface Transaction {
  id: string;
  provider: string;
  transactionType: string;
  amount: number;
  recipient: string;
  balance: number;
  transactionDate: string;
  riskScore: number;
  riskLevel: string;
  riskReasons: string[];
  isBlocked?: boolean;
  isFraudReported?: boolean;
}

export default function TransactionsScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    totalSent: 0,
    totalReceived: 0,
    fraudDetected: 0,
  });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isDark = colorScheme === 'dark';
  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardColor = isDark ? colors.cardDark : colors.card;

  useEffect(() => {
    console.log('TransactionsScreen mounted, user:', user);
    if (!authLoading && !user) {
      console.log('No user found, redirecting to auth');
      router.replace('/auth');
    } else if (user) {
      console.log('User authenticated, loading transactions');
      loadTransactions();
      loadSummary();
    }
  }, [user, authLoading]);

  const loadTransactions = async () => {
    console.log('Loading transactions...');
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const response = await authenticatedGet<{
        transactions: Transaction[];
        total: number;
        page: number;
        totalPages: number;
      }>('/api/transactions?page=1&limit=20');
      
      console.log('Transactions loaded:', response);
      setTransactions(response.transactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      // Show empty state on error
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    console.log('Loading summary...');
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const response = await authenticatedGet<{
        totalSent: number;
        totalReceived: number;
        dailyStats: any[];
        weeklyStats: any[];
        monthlyStats: any[];
        fraudDetected: number;
        moneyProtected: number;
      }>('/api/analytics/summary');
      
      console.log('Summary loaded:', response);
      setSummary({
        totalSent: response.totalSent,
        totalReceived: response.totalReceived,
        fraudDetected: response.fraudDetected,
      });
    } catch (error) {
      console.error('Failed to load summary:', error);
      // Keep default values on error
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    await loadSummary();
    setRefreshing(false);
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW':
        return colors.riskLow;
      case 'MEDIUM':
        return colors.riskMedium;
      case 'HIGH':
        return colors.riskHigh;
      case 'CRITICAL':
        return colors.riskCritical;
      default:
        return colors.textSecondary;
    }
  };

  const formatAmount = (amount: number) => {
    const formattedAmount = amount.toFixed(2);
    return formattedAmount;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      const minsText = `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
      return minsText;
    } else if (diffHours < 24) {
      const hoursText = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      return hoursText;
    } else if (diffDays < 7) {
      const daysText = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      return daysText;
    } else {
      const formatted = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      return formatted;
    }
  };

  const handleTransactionPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowActionModal(true);
  };

  const handleBlockMerchant = async () => {
    if (!selectedTransaction) return;
    
    setActionLoading(true);
    try {
      const { authenticatedPost } = await import('@/utils/api');
      await authenticatedPost(`/api/transactions/${selectedTransaction.id}/block`, {});
      console.log('Merchant blocked successfully');
      
      // Update local state
      setTransactions(prev => 
        prev.map(t => 
          t.id === selectedTransaction.id 
            ? { ...t, isBlocked: true } 
            : t
        )
      );
      
      setShowActionModal(false);
      console.log('✅ Merchant blocked successfully!');
    } catch (error) {
      console.error('❌ Failed to block merchant:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportFraud = async () => {
    if (!selectedTransaction) return;
    
    setActionLoading(true);
    try {
      const { authenticatedPost } = await import('@/utils/api');
      const response = await authenticatedPost<{ success: boolean; newSensitivity: number }>(
        `/api/transactions/${selectedTransaction.id}/report-fraud`,
        {}
      );
      console.log('Fraud reported successfully, new sensitivity:', response.newSensitivity);
      
      // Update local state
      setTransactions(prev => 
        prev.map(t => 
          t.id === selectedTransaction.id 
            ? { ...t, isFraudReported: true } 
            : t
        )
      );
      
      setShowActionModal(false);
      console.log('✅ Fraud reported! Alert sensitivity increased for better protection.');
    } catch (error) {
      console.error('❌ Failed to report fraud:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmSafe = async () => {
    if (!selectedTransaction) return;
    
    setActionLoading(true);
    try {
      const { authenticatedPost } = await import('@/utils/api');
      const response = await authenticatedPost<{ success: boolean; newSensitivity: number }>(
        `/api/transactions/${selectedTransaction.id}/confirm-safe`,
        {}
      );
      console.log('Transaction confirmed as safe, new sensitivity:', response.newSensitivity);
      
      setShowActionModal(false);
      console.log('✅ Transaction confirmed as safe. Your AI is learning your patterns.');
    } catch (error) {
      console.error('❌ Failed to confirm safe:', error);
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'MoMo Analytics',
            headerStyle: { backgroundColor: bgColor },
            headerTintColor: textColor,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: textSecondaryColor }]}>
            Loading transactions...
          </Text>
        </View>
      </View>
    );
  }

  const totalSentText = formatAmount(summary.totalSent);
  const totalReceivedText = formatAmount(summary.totalReceived);
  const fraudDetectedText = summary.fraudDetected.toString();

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'MoMo Analytics',
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
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: cardColor }]}>
            <IconSymbol
              ios_icon_name="arrow.up.circle.fill"
              android_material_icon_name="arrow-upward"
              size={24}
              color={colors.error}
            />
            <Text style={[styles.summaryLabel, { color: textSecondaryColor }]}>
              Total Sent
            </Text>
            <Text style={[styles.summaryAmount, { color: textColor }]}>
              GHS {totalSentText}
            </Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: cardColor }]}>
            <IconSymbol
              ios_icon_name="arrow.down.circle.fill"
              android_material_icon_name="arrow-downward"
              size={24}
              color={colors.success}
            />
            <Text style={[styles.summaryLabel, { color: textSecondaryColor }]}>
              Total Received
            </Text>
            <Text style={[styles.summaryAmount, { color: textColor }]}>
              GHS {totalReceivedText}
            </Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: cardColor }]}>
            <IconSymbol
              ios_icon_name="shield.fill"
              android_material_icon_name="security"
              size={24}
              color={colors.warning}
            />
            <Text style={[styles.summaryLabel, { color: textSecondaryColor }]}>
              Fraud Detected
            </Text>
            <Text style={[styles.summaryAmount, { color: textColor }]}>
              {fraudDetectedText}
            </Text>
          </View>
        </View>

        {/* Transactions List */}
        <View style={styles.transactionsHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Recent Transactions
          </Text>
        </View>

        {transactions.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: cardColor }]}>
            <IconSymbol
              ios_icon_name="tray.fill"
              android_material_icon_name="inbox"
              size={48}
              color={textSecondaryColor}
            />
            <Text style={[styles.emptyText, { color: textSecondaryColor }]}>
              No transactions yet
            </Text>
            <Text style={[styles.emptySubtext, { color: textSecondaryColor }]}>
              Your MoMo transactions will appear here
            </Text>
          </View>
        ) : (
          transactions.map((transaction) => {
            const riskColor = getRiskColor(transaction.riskLevel);
            const amountText = formatAmount(transaction.amount);
            const balanceText = formatAmount(transaction.balance);
            const dateText = formatDate(transaction.transactionDate);
            const isSent = transaction.transactionType === 'sent';
            const typeIcon = isSent ? 'arrow-upward' : 'arrow-downward';
            const typeColor = isSent ? colors.error : colors.success;

            return (
              <TouchableOpacity
                key={transaction.id}
                style={[styles.transactionCard, { backgroundColor: cardColor }]}
                onPress={() => handleTransactionPress(transaction)}
                activeOpacity={0.7}
              >
                <View style={styles.transactionHeader}>
                  <View style={styles.transactionLeft}>
                    <View style={[styles.providerBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.providerText}>
                        {transaction.provider}
                      </Text>
                    </View>
                    <View style={[styles.riskBadge, { backgroundColor: riskColor }]}>
                      <Text style={styles.riskText}>
                        {transaction.riskLevel}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.dateText, { color: textSecondaryColor }]}>
                    {dateText}
                  </Text>
                </View>

                <View style={styles.transactionBody}>
                  <View style={styles.transactionInfo}>
                    <IconSymbol
                      ios_icon_name={isSent ? 'arrow.up.circle' : 'arrow.down.circle'}
                      android_material_icon_name={typeIcon}
                      size={32}
                      color={typeColor}
                    />
                    <View style={styles.transactionDetails}>
                      <Text style={[styles.recipientText, { color: textColor }]}>
                        {transaction.recipient}
                      </Text>
                      <Text style={[styles.balanceText, { color: textSecondaryColor }]}>
                        Balance: GHS {balanceText}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.amountText, { color: typeColor }]}>
                    {isSent ? '-' : '+'}GHS {amountText}
                  </Text>
                </View>

                {transaction.riskReasons.length > 0 && (
                  <View style={styles.riskReasonsContainer}>
                    {transaction.riskReasons.map((reason, index) => (
                      <View key={index} style={styles.riskReasonItem}>
                        <IconSymbol
                          ios_icon_name="exclamationmark.triangle.fill"
                          android_material_icon_name="warning"
                          size={14}
                          color={riskColor}
                        />
                        <Text style={[styles.riskReasonText, { color: textSecondaryColor }]}>
                          {reason}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowActionModal(false)}
        >
          <Pressable 
            style={[styles.modalContent, { backgroundColor: cardColor }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                Transaction Actions
              </Text>
              <TouchableOpacity
                onPress={() => setShowActionModal(false)}
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

            {selectedTransaction && (
              <>
                <View style={styles.modalTransactionInfo}>
                  <Text style={[styles.modalLabel, { color: textSecondaryColor }]}>
                    Merchant
                  </Text>
                  <Text style={[styles.modalValue, { color: textColor }]}>
                    {selectedTransaction.recipient}
                  </Text>
                  
                  <Text style={[styles.modalLabel, { color: textSecondaryColor, marginTop: 12 }]}>
                    Amount
                  </Text>
                  <Text style={[styles.modalValue, { color: textColor }]}>
                    GHS {formatAmount(selectedTransaction.amount)}
                  </Text>
                  
                  <Text style={[styles.modalLabel, { color: textSecondaryColor, marginTop: 12 }]}>
                    Risk Level
                  </Text>
                  <View style={[styles.riskBadge, { backgroundColor: getRiskColor(selectedTransaction.riskLevel) }]}>
                    <Text style={styles.riskText}>
                      {selectedTransaction.riskLevel}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.safeButton]}
                    onPress={handleConfirmSafe}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check-circle"
                          size={20}
                          color="#fff"
                        />
                        <Text style={styles.actionButtonText}>This is Safe</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.blockButton]}
                    onPress={handleBlockMerchant}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <IconSymbol
                          ios_icon_name="hand.raised.fill"
                          android_material_icon_name="block"
                          size={20}
                          color="#fff"
                        />
                        <Text style={styles.actionButtonText}>Block Merchant</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.reportButton]}
                    onPress={handleReportFraud}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <IconSymbol
                          ios_icon_name="exclamationmark.triangle.fill"
                          android_material_icon_name="report"
                          size={20}
                          color="#fff"
                        />
                        <Text style={styles.actionButtonText}>Report Fraud</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => setShowActionModal(false)}
                  >
                    <Text style={[styles.actionButtonText, { color: textColor }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  transactionsHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 48,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  transactionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionLeft: {
    flexDirection: 'row',
    gap: 8,
  },
  providerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  providerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1F2E',
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  riskText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dateText: {
    fontSize: 12,
  },
  transactionBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionDetails: {
    marginLeft: 12,
    flex: 1,
  },
  recipientText: {
    fontSize: 16,
    fontWeight: '600',
  },
  balanceText: {
    fontSize: 14,
    marginTop: 4,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
  },
  riskReasonsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  riskReasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  riskReasonText: {
    fontSize: 12,
    marginLeft: 6,
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
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
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
  modalTransactionInfo: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalActions: {
    gap: 12,
  },
  actionButton: {
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  safeButton: {
    backgroundColor: colors.success,
  },
  blockButton: {
    backgroundColor: colors.warning,
  },
  reportButton: {
    backgroundColor: colors.error,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
