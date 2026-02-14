
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import { useAuth } from "@/contexts/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";

type ReportPeriod = "daily" | "weekly" | "monthly";

interface FinancialReport {
  totalSent: number;
  totalReceived: number;
  transactionCount: number;
  averageAmount: number;
  highestTransaction: number;
  lowestTransaction: number;
  fraudDetectedCount: number;
  periodStart: string;
  periodEnd: string;
}

export default function FinancialReportsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>("daily");
  const [report, setReport] = useState<FinancialReport | null>(null);

  useEffect(() => {
    loadReport();
  }, [selectedPeriod]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const { authenticatedGet } = await import("@/utils/api");
      let endpoint = "";
      const today = new Date().toISOString();

      if (selectedPeriod === "daily") {
        endpoint = `/api/financial-reports/daily?date=${today}`;
      } else if (selectedPeriod === "weekly") {
        endpoint = `/api/financial-reports/weekly?weekStart=${today}`;
      } else {
        endpoint = `/api/financial-reports/monthly?month=${today}`;
      }

      const data = await authenticatedGet(endpoint);
      if (data) {
        setReport(data);
      }
      console.log(`[Financial Reports] ${selectedPeriod} report loaded successfully`);
    } catch (error) {
      console.error("[Financial Reports] Failed to load report:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReport();
    setRefreshing(false);
  };

  const formatAmount = (amount: number) => {
    const amountValue = amount || 0;
    return `GHS ${amountValue.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getNetBalance = () => {
    if (!report) return 0;
    const totalReceived = report.totalReceived || 0;
    const totalSent = report.totalSent || 0;
    return totalReceived - totalSent;
  };

  const backgroundColor = isDark ? colors.background : "#f5f5f5";
  const cardBg = isDark ? colors.cardBackground : "#fff";
  const textColor = isDark ? colors.text : "#000";
  const textSecondary = isDark ? colors.textSecondary : "#666";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
      <Stack.Screen
        options={{
          title: "Financial Reports",
          headerShown: true,
          headerBackTitle: "Back",
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: cardBg }]}>
          <IconSymbol
            ios_icon_name="chart.bar.fill"
            android_material_icon_name="assessment"
            size={64}
            color={colors.warning}
          />
          <Text style={[styles.headerTitle, { color: textColor }]}>
            Financial Analytics
          </Text>
          <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
            Track your MoMo transactions and spending
          </Text>
        </View>

        {/* Period Selector */}
        <View style={[styles.periodSelector, { backgroundColor: cardBg }]}>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === "daily" && {
                backgroundColor: colors.primary,
              },
            ]}
            onPress={() => setSelectedPeriod("daily")}
          >
            <Text
              style={[
                styles.periodButtonText,
                {
                  color:
                    selectedPeriod === "daily" ? "#fff" : textColor,
                },
              ]}
            >
              Daily
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === "weekly" && {
                backgroundColor: colors.primary,
              },
            ]}
            onPress={() => setSelectedPeriod("weekly")}
          >
            <Text
              style={[
                styles.periodButtonText,
                {
                  color:
                    selectedPeriod === "weekly" ? "#fff" : textColor,
                },
              ]}
            >
              Weekly
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === "monthly" && {
                backgroundColor: colors.primary,
              },
            ]}
            onPress={() => setSelectedPeriod("monthly")}
          >
            <Text
              style={[
                styles.periodButtonText,
                {
                  color:
                    selectedPeriod === "monthly" ? "#fff" : textColor,
                },
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
        </View>

        {loading && !report ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: textSecondary }]}>
              Loading report...
            </Text>
          </View>
        ) : report ? (
          <React.Fragment>
            {/* Period Info */}
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.periodLabel, { color: textSecondary }]}>
                Report Period
              </Text>
              <Text style={[styles.periodValue, { color: textColor }]}>
                {formatDate(report.periodStart)} - {formatDate(report.periodEnd)}
              </Text>
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: cardBg, borderLeftColor: colors.success },
                ]}
              >
                <IconSymbol
                  ios_icon_name="arrow.down.circle.fill"
                  android_material_icon_name="arrow-downward"
                  size={32}
                  color={colors.success}
                />
                <Text style={[styles.summaryLabel, { color: textSecondary }]}>
                  Total Received
                </Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>
                  {formatAmount(report.totalReceived)}
                </Text>
              </View>

              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: cardBg, borderLeftColor: colors.error },
                ]}
              >
                <IconSymbol
                  ios_icon_name="arrow.up.circle.fill"
                  android_material_icon_name="arrow-upward"
                  size={32}
                  color={colors.error}
                />
                <Text style={[styles.summaryLabel, { color: textSecondary }]}>
                  Total Sent
                </Text>
                <Text style={[styles.summaryValue, { color: colors.error }]}>
                  {formatAmount(report.totalSent)}
                </Text>
              </View>
            </View>

            {/* Net Balance */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: cardBg,
                  borderColor: getNetBalance() >= 0 ? colors.success : colors.error,
                  borderWidth: 2,
                },
              ]}
            >
              <Text style={[styles.netLabel, { color: textSecondary }]}>
                Net Balance
              </Text>
              <Text
                style={[
                  styles.netValue,
                  { color: getNetBalance() >= 0 ? colors.success : colors.error },
                ]}
              >
                {getNetBalance() >= 0 ? "+" : ""}
                {formatAmount(getNetBalance())}
              </Text>
            </View>

            {/* Transaction Statistics */}
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.cardTitle, { color: textColor }]}>
                Transaction Statistics
              </Text>

              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: textSecondary }]}>
                  Total Transactions
                </Text>
                <Text style={[styles.statValue, { color: textColor }]}>
                  {report.transactionCount}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: textSecondary }]}>
                  Average Amount
                </Text>
                <Text style={[styles.statValue, { color: textColor }]}>
                  {formatAmount(report.averageAmount)}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: textSecondary }]}>
                  Highest Transaction
                </Text>
                <Text style={[styles.statValue, { color: textColor }]}>
                  {formatAmount(report.highestTransaction)}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: textSecondary }]}>
                  Lowest Transaction
                </Text>
                <Text style={[styles.statValue, { color: textColor }]}>
                  {formatAmount(report.lowestTransaction)}
                </Text>
              </View>

              {report.fraudDetectedCount > 0 && (
                <View style={[styles.statRow, { borderBottomWidth: 0 }]}>
                  <Text style={[styles.statLabel, { color: colors.error }]}>
                    Fraud Detected
                  </Text>
                  <Text style={[styles.statValue, { color: colors.error }]}>
                    {report.fraudDetectedCount}
                  </Text>
                </View>
              )}
            </View>

            {/* Fraud Alert */}
            {report.fraudDetectedCount > 0 && (
              <View
                style={[
                  styles.alertBox,
                  { backgroundColor: isDark ? "#3a1a1a" : "#ffebee" },
                ]}
              >
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle.fill"
                  android_material_icon_name="warning"
                  size={24}
                  color={colors.error}
                />
                <Text style={[styles.alertText, { color: colors.error }]}>
                  {report.fraudDetectedCount} suspicious{" "}
                  {report.fraudDetectedCount === 1 ? "transaction" : "transactions"}{" "}
                  detected in this period. Review your transaction history.
                </Text>
              </View>
            )}
          </React.Fragment>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: cardBg }]}>
            <IconSymbol
              ios_icon_name="chart.bar.xaxis"
              android_material_icon_name="assessment"
              size={64}
              color={textSecondary}
            />
            <Text style={[styles.emptyText, { color: textSecondary }]}>
              No transactions found for this period
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    padding: 48,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  headerCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  periodSelector: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  periodLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  periodValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  netLabel: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  netValue: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statLabel: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  alertBox: {
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
  },
  emptyState: {
    borderRadius: 12,
    padding: 48,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
  },
});
