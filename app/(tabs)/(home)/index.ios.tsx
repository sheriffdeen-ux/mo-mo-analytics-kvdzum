
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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { GlassView } from 'expo-glass-effect';

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

  const isDark = colorScheme === 'dark';
  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;

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
    // TODO: Backend Integration - GET /api/transactions → { transactions: [{ id, provider, type, amount, recipient, balance, date, riskScore, riskLevel, riskReasons }], total, page, totalPages }
    
    // Mock data for now
    const mockTransactions: Transaction[] = [
      {
        id: '1',
        provider: 'MTN',
        transactionType: 'sent',
        amount: 150.00,
        recipient: 'Kwame Shop',
        balance: 850.00,
        transactionDate: new Date().toISOString(),
        riskScore: 15,
        riskLevel: 'LOW',
        riskReasons: [],
      },
      {
        id: '2',
        provider: 'Vodafone',
        transactionType: 'received',
        amount: 500.00,
        recipient: 'Ama Mensah',
        balance: 1350.00,
        transactionDate: new Date(Date.now() - 3600000).toISOString(),
        riskScore: 5,
        riskLevel: 'LOW',
        riskReasons: [],
      },
      {
        id: '3',
        provider: 'MTN',
        transactionType: 'sent',
        amount: 1200.00,
        recipient: 'Unknown Merchant',
        balance: 150.00,
        transactionDate: new Date(Date.now() - 7200000).toISOString(),
        riskScore: 65,
        riskLevel: 'HIGH',
        riskReasons: ['Large amount', 'Low balance after transaction', 'Unknown merchant'],
      },
    ];
    
    setTransactions(mockTransactions);
    setLoading(false);
  };

  const loadSummary = async () => {
    console.log('Loading summary...');
    // TODO: Backend Integration - GET /api/analytics/summary → { totalSent, totalReceived, dailyStats, weeklyStats, monthlyStats, fraudDetected, moneyProtected }
    
    // Mock data
    setSummary({
      totalSent: 1350.00,
      totalReceived: 500.00,
      fraudDetected: 1,
    });
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

  if (authLoading || loading) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'MoMo Analytics',
            headerStyle: { backgroundColor: bgColor },
            headerTintColor: textColor,
            headerLargeTitle: true,
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
          headerLargeTitle: true,
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
          <GlassView intensity={80} style={styles.summaryCard}>
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
          </GlassView>

          <GlassView intensity={80} style={styles.summaryCard}>
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
          </GlassView>

          <GlassView intensity={80} style={styles.summaryCard}>
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
          </GlassView>
        </View>

        {/* Transactions List */}
        <View style={styles.transactionsHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Recent Transactions
          </Text>
        </View>

        {transactions.length === 0 ? (
          <GlassView intensity={80} style={styles.emptyContainer}>
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
          </GlassView>
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
              <GlassView
                key={transaction.id}
                intensity={80}
                style={styles.transactionCard}
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
              </GlassView>
            );
          })
        )}
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
});
