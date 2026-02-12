/**
 * 7-Layer Fraud Detection Engine for MoMo Analytics
 * Each layer adds risk points (0-100 scale)
 */

export interface FraudAnalysisInput {
  amount: number;
  recipient?: string;
  balance?: number;
  transactionType: string;
  transactionDate: Date;
  userAverageSentAmount?: number;
  dailySpentAmount?: number;
  dailyLimit: number;
  transactionsInLast1Hour: number;
  transactionsInLast3Hours: number;
  transactionsInLast24Hours: number;
  blockedMerchants: string[];
  trustedMerchants: string[];
  isGlobalBlacklistMerchant: boolean;
}

export interface FraudAnalysisResult {
  riskScore: number; // 0-100
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskReasons: string[];
  detailsByLayer: Record<string, number>;
}

const GLOBAL_BLACKLIST_MERCHANTS = [
  // Add known fraudulent merchants here
  "Unknown Merchant",
  "Unverified Seller",
];

/**
 * Calculate fraud risk score using 7-layer detection
 */
export function calculateFraudRisk(
  input: FraudAnalysisInput
): FraudAnalysisResult {
  const riskReasons: string[] = [];
  const detailsByLayer: Record<string, number> = {};

  let totalScore = 0;

  // Layer 1: Time-based detection (2am-5am +40, 10pm-1am +20, 6am-9pm 0)
  const hour = input.transactionDate.getHours();
  let timeScore = 0;
  if (hour >= 2 && hour < 5) {
    timeScore = 40;
    riskReasons.push("Transaction during unusual early morning hours (2am-5am)");
  } else if (hour >= 22 || hour < 1) {
    timeScore = 20;
    riskReasons.push("Transaction during late night hours (10pm-1am)");
  }
  detailsByLayer["time"] = timeScore;
  totalScore += timeScore;

  // Layer 2: Amount-based detection
  let amountScore = 0;
  if (input.amount > 5000) {
    amountScore = 50;
    riskReasons.push("Very large transaction amount (>GHS 5,000)");
  } else if (input.amount > 1000) {
    amountScore = 30;
    riskReasons.push("Large transaction amount (>GHS 1,000)");
  }

  // Check if amount is 3x user average
  if (
    input.userAverageSentAmount &&
    input.amount > input.userAverageSentAmount * 3
  ) {
    amountScore = Math.max(amountScore, 25);
    riskReasons.push(
      `Transaction amount is 3x user average (GHS ${input.userAverageSentAmount.toFixed(2)})`
    );
  }

  // Very small amounts are generally low risk
  if (input.amount < 10) {
    amountScore = 0;
  }

  detailsByLayer["amount"] = amountScore;
  totalScore += amountScore;

  // Layer 3: Daily limit check
  let dailyLimitScore = 0;
  if (input.dailySpentAmount && input.dailySpentAmount > input.dailyLimit) {
    dailyLimitScore = 25;
    riskReasons.push(
      `Daily spending limit exceeded (GHS ${input.dailyLimit}/day)`
    );
  }
  detailsByLayer["dailyLimit"] = dailyLimitScore;
  totalScore += dailyLimitScore;

  // Layer 4: Velocity detection (transaction frequency)
  let velocityScore = 0;
  if (input.transactionsInLast1Hour >= 3) {
    velocityScore = 20;
    riskReasons.push(
      `High transaction velocity: ${input.transactionsInLast1Hour} transactions in last hour`
    );
  }
  if (input.transactionsInLast3Hours >= 5) {
    velocityScore = Math.max(velocityScore, 30);
    riskReasons.push(
      `High transaction velocity: ${input.transactionsInLast3Hours} transactions in last 3 hours`
    );
  }
  if (input.transactionsInLast24Hours >= 10) {
    velocityScore = Math.max(velocityScore, 40);
    riskReasons.push(
      `Very high transaction velocity: ${input.transactionsInLast24Hours} transactions in last 24 hours`
    );
  }
  detailsByLayer["velocity"] = velocityScore;
  totalScore += velocityScore;

  // Layer 5: Merchant/Recipient check
  let merchantScore = 0;
  if (input.recipient) {
    if (input.blockedMerchants.includes(input.recipient)) {
      merchantScore = 50;
      riskReasons.push("Transaction to user-blocked merchant");
    } else if (input.isGlobalBlacklistMerchant) {
      merchantScore = 60;
      riskReasons.push("Transaction to globally blacklisted merchant");
    } else if (input.trustedMerchants.includes(input.recipient)) {
      // Trusted merchants reduce risk slightly
      merchantScore = -10;
      riskReasons.push(
        "Transaction to trusted merchant (risk reduced by 10)"
      );
    }
  }
  detailsByLayer["merchant"] = merchantScore;
  totalScore += merchantScore;

  // Layer 6: Round amount detection
  // Exact round amounts like 100, 500, 1000 etc are sometimes suspicious
  let roundScore = 0;
  const roundAmounts = [100, 500, 1000, 2000, 5000, 10000];
  if (roundAmounts.includes(input.amount)) {
    roundScore = 15;
    riskReasons.push("Transaction amount is a round number (suspicious pattern)");
  }
  detailsByLayer["roundAmount"] = roundScore;
  totalScore += roundScore;

  // Layer 7: Account balance check
  let balanceScore = 0;
  if (input.balance !== undefined) {
    if (input.balance < 10) {
      balanceScore = 30;
      riskReasons.push("Account balance critically low (<GHS 10)");
    } else if (input.balance < 50) {
      balanceScore = 20;
      riskReasons.push("Account balance very low (<GHS 50)");
    }

    // Check for sudden drops in balance
    const expectedBalanceAfterTransaction =
      input.balance + (input.transactionType === "received" ? 0 : input.amount);
    if (
      expectedBalanceAfterTransaction > 0 &&
      input.balance < expectedBalanceAfterTransaction * 0.5
    ) {
      balanceScore = Math.max(balanceScore, 15);
      riskReasons.push("Sudden significant drop in account balance");
    }
  }
  detailsByLayer["balance"] = balanceScore;
  totalScore += balanceScore;

  // Cap score at 0-100
  const riskScore = Math.min(Math.max(totalScore, 0), 100);

  // Determine risk level
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  if (riskScore >= 80) {
    riskLevel = "CRITICAL";
  } else if (riskScore >= 60) {
    riskLevel = "HIGH";
  } else if (riskScore >= 40) {
    riskLevel = "MEDIUM";
  } else {
    riskLevel = "LOW";
  }

  return {
    riskScore,
    riskLevel,
    riskReasons,
    detailsByLayer,
  };
}

/**
 * Check if merchant is in global blacklist
 */
export function isGlobalBlacklistMerchant(merchantName: string): boolean {
  if (!merchantName) return false;
  const lowerName = merchantName.toLowerCase();
  return GLOBAL_BLACKLIST_MERCHANTS.some((merchant) =>
    lowerName.includes(merchant.toLowerCase())
  );
}

/**
 * Calculate average transaction amount for a user
 */
export function calculateAverageTransactionAmount(
  amounts: number[]
): number | undefined {
  if (amounts.length === 0) return undefined;
  const sum = amounts.reduce((a, b) => a + b, 0);
  return sum / amounts.length;
}

/**
 * Get FCM notification priority based on risk level
 */
export function getFCMNotificationPriority(
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
): {
  priority: string;
  includeSound: boolean;
  includeVibration: boolean;
} {
  switch (riskLevel) {
    case "CRITICAL":
      return {
        priority: "max",
        includeSound: true,
        includeVibration: true,
      };
    case "HIGH":
      return {
        priority: "high",
        includeSound: true,
        includeVibration: false,
      };
    case "MEDIUM":
      return {
        priority: "high",
        includeSound: false,
        includeVibration: false,
      };
    case "LOW":
    default:
      return {
        priority: "normal",
        includeSound: false,
        includeVibration: false,
      };
  }
}
