/**
 * MoMo Fraud Detection Agent
 * Advanced ML-inspired fraud detection for Ghana mobile money transactions
 */

import type { App } from "../index.js";
import type { ParsedTransaction } from "./telecel-sms-parser.js";
import * as schema from "../db/schema.js";
import { eq, and, gte, lte } from "drizzle-orm";

// Official MoMo provider sender IDs
const OFFICIAL_SENDER_IDS = {
  MTN: ["447", "4255", "MTNMoMo"],
  Vodafone: ["557", "VCash"],
  AirtelTigo: ["505", "TMoney"],
  "Telecel Cash": ["2020", "TeleCash"],
};

// Scam keywords for pattern detection
const SCAM_KEYWORDS = [
  "urgent",
  "verify",
  "confirm",
  "update",
  "click",
  "link",
  "reward",
  "prize",
  "claim",
  "winner",
  "tax",
  "refund",
  "blocked",
  "limited",
  "suspend",
  "unusual activity",
  "authenticate",
];

// Ghana-specific fake institutions
const FAKE_INSTITUTIONS = [
  "Bank of Ghana",
  "GRA",
  "SSNIT",
  "ECG",
  "Ghana Water",
  "Police",
  "Court",
];

// Ghana-specific suspicious phrases
const SUSPICIOUS_PHRASES = [
  "tax payment",
  "clearance fee",
  "processing fee",
  "activation fee",
];

export interface FraudDetectionResult {
  riskScore: number; // 0-100
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskFactors: string[];
  layerAnalysis: {
    layer1: Layer1Result;
    layer2: Layer2Result;
    layer3: Layer3Result;
    layer4: Layer4Result;
    layer5: Layer5Result;
    layer6: Layer6Result;
    layer7: Layer7Result;
  };
  shouldAlert: boolean;
  recommendedActions: string[];
}

export interface Layer1Result {
  status: "PASS" | "FAIL";
  senderIdValid: boolean;
  senderIdScore: number;
  extractedFields: {
    provider: string | null;
    type: string | null;
    amount: number | null;
    recipientPhone: string | null;
    senderPhone: string | null;
    balance: number | null;
    reference: string | null;
  };
}

export interface Layer2Result {
  status: "PASS" | "FAIL";
  validationErrors: string[];
}

export interface Layer3Result {
  scamKeywordCount: number;
  scamKeywordScore: number;
  fakeInstitutionScore: number;
  suspiciousPhraseScore: number;
  totalPatternScore: number;
}

export interface Layer4Result {
  averageTransactionAmount: number | null;
  anomalyScore: number;
  frequencyScore: number;
  anomalyFactors: string[];
}

export interface Layer5Result {
  velocityScore: number;
  velocityFactors: string[];
}

export interface Layer6Result {
  amountScore: number;
  roundAmountBonus: number;
  totalAmountScore: number;
}

export interface Layer7Result {
  timeScore: number;
  dayScore: number;
  totalTemporalScore: number;
  temporalFactors: string[];
}

/**
 * Layer 1: SMS Parsing & Sender Verification
 */
export function layer1_senderVerification(
  parsed: ParsedTransaction,
  rawSms: string
): Layer1Result {
  const validationErrors: string[] = [];

  // Extract sender ID from SMS (simplified - would need actual SMS metadata in production)
  // For now, we'll check if provider is in the SMS which validates it came from that provider
  let senderIdValid = false;
  let senderIdScore = 0;

  if (parsed.provider) {
    // Check if provider name is legitimate
    const providerKeys = Object.keys(OFFICIAL_SENDER_IDS) as Array<
      keyof typeof OFFICIAL_SENDER_IDS
    >;
    if (providerKeys.includes(parsed.provider as any)) {
      senderIdValid = true;
      senderIdScore = 0; // Official sender
    } else {
      senderIdValid = false;
      senderIdScore = 80; // CRITICAL: Unknown provider
      validationErrors.push("Unknown or unrecognized MoMo provider");
    }
  } else {
    senderIdValid = false;
    senderIdScore = 80; // CRITICAL: No provider detected
    validationErrors.push("Provider not detected - possible spoofing");
  }

  return {
    status: senderIdValid ? "PASS" : "FAIL",
    senderIdValid,
    senderIdScore,
    extractedFields: {
      provider: parsed.provider,
      type: parsed.type,
      amount: parsed.amount,
      recipientPhone:
        parsed.type === "sent" ? parsed.receiverNumber : parsed.senderNumber,
      senderPhone:
        parsed.type === "received" ? parsed.senderNumber : parsed.receiverNumber,
      balance: parsed.balance,
      reference: parsed.transactionId,
    },
  };
}

/**
 * Layer 2: Input Validation
 */
export function layer2_inputValidation(
  parsed: ParsedTransaction
): Layer2Result {
  const validationErrors: string[] = [];

  if (!parsed.type) validationErrors.push("Transaction type missing");
  if (!parsed.amount || parsed.amount <= 0)
    validationErrors.push("Invalid amount");
  if (!parsed.transactionDate)
    validationErrors.push("Transaction date missing");
  if (!parsed.time) validationErrors.push("Transaction time missing");
  if (!parsed.provider) validationErrors.push("Provider missing");

  // Check for type-specific fields
  if (parsed.type === "received" && !parsed.senderNumber) {
    validationErrors.push("Sender phone missing for received transaction");
  }
  if (parsed.type === "sent" && !parsed.receiverNumber) {
    validationErrors.push("Receiver phone missing for sent transaction");
  }
  if (parsed.type === "cash_out" && !parsed.merchantName) {
    validationErrors.push("Merchant name missing for cash out");
  }

  return {
    status: validationErrors.length === 0 ? "PASS" : "FAIL",
    validationErrors,
  };
}

/**
 * Layer 3: Scam Pattern Recognition
 */
export function layer3_patternRecognition(rawSms: string): Layer3Result {
  const smsUpper = rawSms.toUpperCase();

  // Count scam keywords
  let scamKeywordCount = 0;
  SCAM_KEYWORDS.forEach((keyword) => {
    if (smsUpper.includes(keyword.toUpperCase())) {
      scamKeywordCount++;
    }
  });
  const scamKeywordScore = Math.min(100, scamKeywordCount * 10);

  // Check for fake institutions
  let fakeInstitutionScore = 0;
  FAKE_INSTITUTIONS.forEach((institution) => {
    if (smsUpper.includes(institution.toUpperCase())) {
      fakeInstitutionScore = 30; // Each fake institution adds 30 points
    }
  });

  // Check for suspicious phrases
  let suspiciousPhraseScore = 0;
  SUSPICIOUS_PHRASES.forEach((phrase) => {
    if (smsUpper.includes(phrase.toUpperCase())) {
      suspiciousPhraseScore += 20;
    }
  });

  const totalPatternScore = Math.min(
    100,
    scamKeywordScore + fakeInstitutionScore + suspiciousPhraseScore
  );

  return {
    scamKeywordCount,
    scamKeywordScore,
    fakeInstitutionScore,
    suspiciousPhraseScore,
    totalPatternScore,
  };
}

/**
 * Layer 4: Historical Behavior Analysis
 */
export async function layer4_behavioralAnalysis(
  app: App,
  userId: string,
  parsed: ParsedTransaction
): Promise<Layer4Result> {
  const anomalyFactors: string[] = [];
  let anomalyScore = 0;
  let frequencyScore = 0;

  try {
    // Get user's transaction history from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get behavior profile
    let [profile] = await app.db
      .select()
      .from(schema.userBehaviorProfile)
      .where(eq(schema.userBehaviorProfile.userId, userId));

    // Convert decimal string to number, or null if not present
    const avgAmount = profile?.avgTransactionAmount
      ? parseFloat(profile.avgTransactionAmount.toString())
      : null;

    // Check for amount anomaly (3x higher than average)
    if (
      avgAmount &&
      parsed.amount &&
      parsed.amount > avgAmount * 3
    ) {
      anomalyScore += 25;
      anomalyFactors.push(
        `Amount GHS ${parsed.amount} is 3x higher than user's average of GHS ${avgAmount}`
      );
    }

    // Check for time anomaly
    if (parsed.time) {
      const [hours] = parsed.time.split(":");
      const hour = parseInt(hours);
      if (hour >= 2 && hour <= 5) {
        // Very late night / early morning
        anomalyScore += 40;
        anomalyFactors.push(`Transaction at ${parsed.time} (2am-5am high-risk time)`);
      } else if (hour >= 22 && hour <= 1) {
        // Late night
        anomalyScore += 20;
        anomalyFactors.push(`Transaction at ${parsed.time} (late night hours)`);
      }
    }

    // Check transaction frequency (simplified - would need transaction count in behavior profile)
    // This would be populated from actual transaction history

    return {
      averageTransactionAmount: avgAmount,
      anomalyScore: Math.min(100, anomalyScore),
      frequencyScore,
      anomalyFactors,
    };
  } catch (error) {
    app.logger.warn(
      { err: error, userId },
      "Failed to analyze behavioral patterns"
    );
    return {
      averageTransactionAmount: null,
      anomalyScore: 0,
      frequencyScore: 0,
      anomalyFactors: [],
    };
  }
}

/**
 * Layer 5: Transaction Velocity Checks
 */
export async function layer5_velocityAnalysis(
  app: App,
  userId: string
): Promise<Layer5Result> {
  const velocityFactors: string[] = [];
  let velocityScore = 0;

  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get transaction counts by time period
    // Simplified - would need actual transaction counting
    // In production, would count from transactions table

    // These would be populated from actual data
    const txLastHour = 0;
    const txLastThreeHours = 0;
    const txLastDay = 0;

    if (txLastHour >= 3) {
      velocityScore += 20;
      velocityFactors.push(`${txLastHour} transactions in last hour`);
    }
    if (txLastThreeHours >= 5) {
      velocityScore += 30;
      velocityFactors.push(`${txLastThreeHours} transactions in last 3 hours`);
    }
    if (txLastDay >= 10) {
      velocityScore += 40;
      velocityFactors.push(`${txLastDay} transactions in last 24 hours`);
    }

    return {
      velocityScore: Math.min(100, velocityScore),
      velocityFactors,
    };
  } catch (error) {
    app.logger.warn(
      { err: error, userId },
      "Failed to analyze transaction velocity"
    );
    return {
      velocityScore: 0,
      velocityFactors: [],
    };
  }
}

/**
 * Layer 6: Amount-based Risk Scoring
 */
export function layer6_amountAnalysis(parsed: ParsedTransaction): Layer6Result {
  let amountScore = 0;
  let roundAmountBonus = 0;

  if (parsed.amount) {
    if (parsed.amount >= 5000) {
      amountScore = 50;
    } else if (parsed.amount >= 1000) {
      amountScore = 30;
    } else if (parsed.amount >= 100) {
      amountScore = 10;
    } else {
      amountScore = 0;
    }

    // Check if round amount (100, 500, 1000, 5000, etc.)
    const roundAmounts = [100, 500, 1000, 5000, 10000];
    if (roundAmounts.includes(parsed.amount)) {
      roundAmountBonus = 15;
    }
  }

  return {
    amountScore,
    roundAmountBonus,
    totalAmountScore: Math.min(100, amountScore + roundAmountBonus),
  };
}

/**
 * Layer 7: Temporal Analysis
 */
export function layer7_temporalAnalysis(parsed: ParsedTransaction): Layer7Result {
  const temporalFactors: string[] = [];
  let timeScore = 0;
  let dayScore = 0;

  if (parsed.time) {
    const [hours] = parsed.time.split(":");
    const hour = parseInt(hours);

    // Time-based scoring
    if (hour >= 2 && hour <= 5) {
      timeScore = 50; // Very suspicious time
      temporalFactors.push(`Very early morning (${hour}:XX)`);
    } else if (hour >= 0 && hour <= 1) {
      timeScore = 40; // Late night / midnight
      temporalFactors.push(`Late night after midnight`);
    } else if (hour >= 22) {
      timeScore = 30; // Late night (10pm+)
      temporalFactors.push(`Late evening (${hour}:XX)`);
    } else if (hour >= 20 && hour <= 21) {
      timeScore = 15; // Early evening
    }
  }

  // Day-based scoring (weekends more suspicious)
  if (parsed.transactionDate) {
    const date = new Date(parsed.transactionDate);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      dayScore = 10; // Weekend
      temporalFactors.push("Weekend transaction");
    }
  }

  return {
    timeScore,
    dayScore,
    totalTemporalScore: Math.min(100, timeScore + dayScore),
    temporalFactors,
  };
}

/**
 * Composite Risk Scoring
 */
export async function executeFraudDetectionAnalysis(
  app: App,
  userId: string,
  parsed: ParsedTransaction,
  rawSms: string
): Promise<FraudDetectionResult> {
  // CRITICAL: Non-transactional message types (balance inquiry, failed, promotional, other)
  // are ALWAYS LOW RISK - they're informational or service messages, not actual transactions
  if (
    parsed.type === "balance_inquiry" ||
    parsed.type === "failed" ||
    parsed.type === "promotional" ||
    parsed.type === "other"
  ) {
    return {
      riskScore: 0,
      riskLevel: "LOW",
      riskFactors: [],
      layerAnalysis: {
        layer1: { status: "PASS", senderIdValid: true, senderIdScore: 0, extractedFields: {} as any },
        layer2: { status: "PASS", validationErrors: [] },
        layer3: {
          scamKeywordCount: 0,
          scamKeywordScore: 0,
          fakeInstitutionScore: 0,
          suspiciousPhraseScore: 0,
          totalPatternScore: 0,
        },
        layer4: { averageTransactionAmount: null, anomalyScore: 0, frequencyScore: 0, anomalyFactors: [] },
        layer5: { velocityScore: 0, velocityFactors: [] },
        layer6: { amountScore: 0, roundAmountBonus: 0, totalAmountScore: 0 },
        layer7: { timeScore: 0, dayScore: 0, totalTemporalScore: 0, temporalFactors: [] },
      },
      shouldAlert: false,
      recommendedActions: [],
    };
  }

  // Execute all 7 layers for actual transactions
  const layer1 = layer1_senderVerification(parsed, rawSms);
  const layer2 = layer2_inputValidation(parsed);
  const layer3 = layer3_patternRecognition(rawSms);
  const layer4 = await layer4_behavioralAnalysis(app, userId, parsed);
  const layer5 = await layer5_velocityAnalysis(app, userId);
  const layer6 = layer6_amountAnalysis(parsed);
  const layer7 = layer7_temporalAnalysis(parsed);

  // Calculate composite risk score
  let totalScore = 0;
  const riskFactors: string[] = [];

  // Layer 1: Sender verification (critical)
  if (layer1.senderIdScore > 0) {
    totalScore += layer1.senderIdScore;
    riskFactors.push("Unknown or spoofed sender ID");
  }

  // Layer 3: Pattern recognition
  totalScore += layer3.totalPatternScore;
  if (layer3.scamKeywordCount > 0) {
    riskFactors.push(`${layer3.scamKeywordCount} scam keywords detected`);
  }
  if (layer3.fakeInstitutionScore > 0) {
    riskFactors.push("Fake institution mentioned");
  }
  if (layer3.suspiciousPhraseScore > 0) {
    riskFactors.push("Suspicious transaction phrases");
  }

  // Layer 4: Behavioral anomaly
  totalScore += layer4.anomalyScore;
  riskFactors.push(...layer4.anomalyFactors);

  // Layer 5: Velocity
  totalScore += layer5.velocityScore;
  riskFactors.push(...layer5.velocityFactors);

  // Layer 6: Amount
  totalScore += layer6.totalAmountScore;

  // Layer 7: Temporal
  totalScore += layer7.totalTemporalScore;
  riskFactors.push(...layer7.temporalFactors);

  // Cap total score
  totalScore = Math.min(100, totalScore);

  // CRITICAL: Airtime purchases and bill payments from known providers are ALWAYS LOW RISK
  // These are low-risk transaction types
  if ((parsed.type === "airtime" || parsed.type === "bill_payment") && layer1.senderIdValid) {
    totalScore = Math.max(0, Math.min(20, totalScore));
  }
  // Special case: Legitimate known providers with no fraud indicators default to LOW
  else if (
    layer1.senderIdValid &&
    layer2.status === "PASS" &&
    layer3.totalPatternScore === 0 &&
    layer4.anomalyScore === 0
  ) {
    totalScore = Math.max(0, Math.min(20, totalScore));
  }

  // Determine risk level
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  if (totalScore >= 80) {
    riskLevel = "CRITICAL";
  } else if (totalScore >= 60) {
    riskLevel = "HIGH";
  } else if (totalScore >= 35) {
    riskLevel = "MEDIUM";
  } else {
    riskLevel = "LOW";
  }

  // Generate recommended actions
  const recommendedActions: string[] = [];
  if (riskLevel === "CRITICAL") {
    recommendedActions.push("DO NOT send money - likely scam");
    recommendedActions.push("Report to your bank immediately");
    recommendedActions.push("Check your account for unauthorized access");
  } else if (riskLevel === "HIGH") {
    recommendedActions.push("Verify transaction details with recipient");
    recommendedActions.push("Contact your bank if suspicious");
    recommendedActions.push("Never click links in suspicious SMS");
  } else if (riskLevel === "MEDIUM") {
    recommendedActions.push("Review transaction details carefully");
    recommendedActions.push("Confirm recipient identity");
  }

  const shouldAlert = riskLevel === "HIGH" || riskLevel === "CRITICAL";

  return {
    riskScore: totalScore,
    riskLevel,
    riskFactors,
    layerAnalysis: {
      layer1,
      layer2,
      layer3,
      layer4,
      layer5,
      layer6,
      layer7,
    },
    shouldAlert,
    recommendedActions,
  };
}
