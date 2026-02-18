/**
 * 7-Layer Security Framework for MoMo Fraud Detection
 * Comprehensive fraud detection system with multi-layer analysis
 */

import { App } from "../index.js";
import * as schema from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";

export interface Layer1Result {
  status: "PASS" | "FAIL";
  provider: "MTN" | "Vodafone" | "AirtelTigo" | null;
  type: string | null;
  amount: number | null;
  recipient: string | null;
  balance: number | null;
  reference: string | null;
  timestamp: Date;
  rawData: string;
}

export interface Layer2Result {
  status: "PASS" | "FAIL";
  validationErrors: string[];
  sanitizedData: Record<string, any>;
}

export interface Layer3Result {
  status: "PASS" | "WARNING";
  nlpScore: number; // 0-100
  scamKeywords: string[];
  sentiment: "positive" | "neutral" | "negative";
}

export interface Layer4Result {
  status: "PASS" | "WARNING";
  velocityScore: number;
  anomalyDetected: boolean;
  anomalyReason: string | null;
  userProfile: {
    avgAmount: number | null;
    isOutlier: boolean;
    lastTransactionTime: Date | null;
  };
}

export interface Layer5Result {
  status: "PASS" | "FAIL";
  riskScore: number; // 0-100
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  breakdown: {
    amountScore: number;
    timeScore: number;
    velocityScore: number;
    blacklistScore: number;
    roundAmountScore: number;
    behaviorScore: number;
    nlpScore: number;
  };
}

export interface Layer6Result {
  status: "PASS";
  alertLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  shouldAlert: boolean;
}

export interface Layer7Result {
  status: "PASS";
  auditTrail: {
    timestamp: Date;
    layers: string[];
    riskScore: number;
    alertGenerated: boolean;
    complianceStatus: "COMPLIANT" | "REVIEW_REQUIRED";
  };
}

export interface SecurityAnalysisResult {
  layer1: Layer1Result;
  layer2: Layer2Result;
  layer3: Layer3Result;
  layer4: Layer4Result;
  layer5: Layer5Result;
  layer6: Layer6Result;
  layer7: Layer7Result;
  totalProcessingTimeMs: number;
  overallStatus: "PASS" | "WARNING" | "ALERT";
}

const SCAM_KEYWORDS = [
  "urgent",
  "verify",
  "suspended",
  "click",
  "link",
  "prize",
  "winner",
  "claim",
  "confirm",
  "update",
  "action required",
  "account compromised",
];

/**
 * Layer 1: SMS Capture & Parsing
 */
export function layer1_smsCaptureAndParsing(
  smsMessage: string
): Layer1Result {
  const startTime = Date.now();

  try {
    // Provider detection
    let provider: "MTN" | "Vodafone" | "AirtelTigo" | null = null;
    if (
      smsMessage.includes("MTN") ||
      smsMessage.includes("MOMO") ||
      smsMessage.includes("Mobile Money")
    ) {
      provider = "MTN";
    } else if (smsMessage.includes("Vodafone")) {
      provider = "Vodafone";
    } else if (smsMessage.includes("AirtelTigo") || smsMessage.includes("Airteltigo")) {
      provider = "AirtelTigo";
    }

    // Transaction type detection
    let type = null;
    if (
      smsMessage.match(/sent|transferred|sent to/i) ||
      smsMessage.match(/paid/)
    ) {
      type = "sent";
    } else if (smsMessage.match(/received|credited|received from/i)) {
      type = "received";
    } else if (smsMessage.match(/withdraw/i)) {
      type = "withdrawal";
    } else if (smsMessage.match(/deposit/i)) {
      type = "deposit";
    }

    // Extract amount
    const amountMatch = smsMessage.match(/GHS\s*([0-9,]+\.?\d*)/i);
    const amount = amountMatch
      ? parseFloat(amountMatch[1].replace(/,/g, ""))
      : null;

    // Extract recipient
    const recipientMatch = smsMessage.match(/(?:to|from)\s+([A-Za-z\s]+?)(?:\.|,|$)/i);
    const recipient = recipientMatch ? recipientMatch[1].trim() : null;

    // Extract balance
    const balanceMatch = smsMessage.match(/balance[\s:]*GHS\s*([0-9,]+\.?\d*)/i);
    const balance = balanceMatch
      ? parseFloat(balanceMatch[1].replace(/,/g, ""))
      : null;

    // Extract reference
    const refMatch = smsMessage.match(/(?:Ref|Reference|ID)[\s:]*([A-Z0-9]+)/i);
    const reference = refMatch ? refMatch[1] : null;

    const timestamp = new Date();

    return {
      status: provider && type && amount ? "PASS" : "FAIL",
      provider,
      type,
      amount,
      recipient,
      balance,
      reference,
      timestamp,
      rawData: smsMessage,
    };
  } catch (error) {
    return {
      status: "FAIL",
      provider: null,
      type: null,
      amount: null,
      recipient: null,
      balance: null,
      reference: null,
      timestamp: new Date(),
      rawData: smsMessage,
    };
  }
}

/**
 * Layer 2: Input Validation & Sanitization
 */
export function layer2_inputValidation(
  layer1Data: Layer1Result
): Layer2Result {
  const errors: string[] = [];
  const sanitized: Record<string, any> = {};

  // Validate amount
  if (!layer1Data.amount || layer1Data.amount <= 0) {
    errors.push("Invalid or missing amount");
  } else if (layer1Data.amount > 999999999.99) {
    errors.push("Amount exceeds maximum limit");
  } else {
    sanitized.amount = layer1Data.amount;
  }

  // Validate provider
  if (!layer1Data.provider) {
    errors.push("Unknown provider");
  } else {
    sanitized.provider = layer1Data.provider;
  }

  // Validate transaction type
  if (!layer1Data.type) {
    errors.push("Unknown transaction type");
  } else {
    sanitized.type = layer1Data.type;
  }

  // Validate timestamp
  if (!layer1Data.timestamp) {
    errors.push("Invalid timestamp");
  } else {
    sanitized.timestamp = layer1Data.timestamp;
  }

  // Sanitize text fields
  if (layer1Data.recipient) {
    sanitized.recipient = layer1Data.recipient
      .trim()
      .replace(/[^a-zA-Z0-9\s-]/g, "");
  }

  if (layer1Data.reference) {
    sanitized.reference = layer1Data.reference
      .trim()
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
  }

  if (layer1Data.balance) {
    sanitized.balance = layer1Data.balance;
  }

  return {
    status: errors.length === 0 ? "PASS" : "FAIL",
    validationErrors: errors,
    sanitizedData: sanitized,
  };
}

/**
 * Layer 3: Pattern Recognition & NLP
 */
export function layer3_patternRecognitionNLP(sms: string): Layer3Result {
  let nlpScore = 0;
  const scamKeywords: string[] = [];
  let sentiment: "positive" | "neutral" | "negative" = "neutral";

  const lowerSms = sms.toLowerCase();

  // Check for scam keywords
  for (const keyword of SCAM_KEYWORDS) {
    if (lowerSms.includes(keyword)) {
      scamKeywords.push(keyword);
      nlpScore += 15;
    }
  }

  // Check for suspicious patterns
  if (lowerSms.match(/\b(click|tap|call|visit|confirm|verify|update)\b/i)) {
    nlpScore += 10;
  }

  // Check for URL patterns
  if (lowerSms.match(/http|www|\.com|\.net|\.org/)) {
    nlpScore += 20;
  }

  // Check for phone number patterns
  if (lowerSms.match(/0\d{9}|(\+\d{1,3})?\d{9,}/)) {
    nlpScore += 5;
  }

  // Sentiment analysis (simple heuristic)
  if (
    lowerSms.match(
      /urgent|immediately|confirm|verify|suspended|compromised|claim|winner|prize/i
    )
  ) {
    sentiment = "negative";
    nlpScore += 10;
  } else if (lowerSms.match(/confirmed|success|completed|thank/i)) {
    sentiment = "positive";
  }

  // Cap score at 100
  nlpScore = Math.min(nlpScore, 100);

  return {
    status: scamKeywords.length > 0 ? "WARNING" : "PASS",
    nlpScore,
    scamKeywords,
    sentiment,
  };
}

/**
 * Layer 4: Behavioral Analytics & User Profiling
 */
export async function layer4_behavioralAnalytics(
  app: App,
  userId: string,
  layer1Data: Layer1Result
): Promise<Layer4Result> {
  let velocityScore = 0;
  let anomalyDetected = false;
  let anomalyReason: string | null = null;
  const userProfile: Layer4Result["userProfile"] = {
    avgAmount: null,
    isOutlier: false,
    lastTransactionTime: null,
  };

  try {
    // Get user's last 30 transactions
    const recentTransactions = await app.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.userId, userId))
      .orderBy(desc(schema.transactions.transactionDate))
      .limit(30);

    if (recentTransactions.length > 0) {
      // Calculate average amount
      const avgAmount =
        recentTransactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) /
        recentTransactions.length;

      userProfile.avgAmount = avgAmount;
      userProfile.lastTransactionTime = recentTransactions[0].transactionDate;

      // Check for amount anomaly (3x average)
      if (layer1Data.amount && layer1Data.amount > avgAmount * 3) {
        anomalyDetected = true;
        anomalyReason = `Amount is ${(layer1Data.amount / avgAmount).toFixed(1)}x user's average`;
        velocityScore += 25;
        userProfile.isOutlier = true;
      }

      // Velocity check - transactions in last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const lastHourTransactions = recentTransactions.filter(
        (t) => t.transactionDate > oneHourAgo
      );

      if (lastHourTransactions.length > 3) {
        velocityScore += 20;
        anomalyReason = `${lastHourTransactions.length} transactions in last hour`;
      } else if (lastHourTransactions.length > 5) {
        velocityScore += 30;
        anomalyReason = `${lastHourTransactions.length} transactions in last 3 hours`;
      }

      // Time pattern check
      const hour = layer1Data.timestamp.getHours();
      const typicalHours = recentTransactions
        .map((t) => t.transactionDate.getHours())
        .slice(0, 10);

      if (!typicalHours.includes(hour)) {
        velocityScore += 10;
      }
    } else {
      // New user - set default
      userProfile.avgAmount = layer1Data.amount || 0;
    }

    velocityScore = Math.min(velocityScore, 100);

    return {
      status: anomalyDetected ? "WARNING" : "PASS",
      velocityScore,
      anomalyDetected,
      anomalyReason,
      userProfile,
    };
  } catch (error) {
    return {
      status: "PASS",
      velocityScore: 0,
      anomalyDetected: false,
      anomalyReason: null,
      userProfile,
    };
  }
}

/**
 * Layer 5: Real-Time Risk Scoring Engine
 */
export async function layer5_riskScoringEngine(
  app: App,
  userId: string,
  layer1Data: Layer1Result,
  layer3Data: Layer3Result,
  layer4Data: Layer4Result,
  logger?: any
): Promise<Layer5Result> {
  let riskScore = 0;
  const breakdown = {
    amountScore: 0,
    timeScore: 0,
    velocityScore: 0,
    blacklistScore: 0,
    roundAmountScore: 0,
    behaviorScore: 0,
    nlpScore: 0,
  };

  // Amount thresholds
  if (layer1Data.amount) {
    if (layer1Data.amount < 100) {
      breakdown.amountScore = 0;
    } else if (layer1Data.amount < 500) {
      breakdown.amountScore = 20;
    } else if (layer1Data.amount < 2000) {
      breakdown.amountScore = 40;
    } else {
      breakdown.amountScore = 60;
    }
    riskScore += breakdown.amountScore;
  }

  // Time patterns
  const hour = layer1Data.timestamp.getHours();
  if (hour >= 0 && hour < 5) {
    breakdown.timeScore = 40;
  } else if (hour >= 22 || hour < 24) {
    breakdown.timeScore = 20;
  }
  riskScore += breakdown.timeScore;

  // Velocity score
  breakdown.velocityScore = layer4Data.velocityScore;
  riskScore += breakdown.velocityScore;

  // Round amounts (suspicious)
  if (layer1Data.amount && layer1Data.amount % 100 === 0) {
    breakdown.roundAmountScore = 15;
    riskScore += 15;
  }

  // Behavioral anomaly
  if (layer4Data.anomalyDetected) {
    breakdown.behaviorScore = 25;
    riskScore += 25;
  }

  // NLP/Scam keywords
  breakdown.nlpScore = layer3Data.nlpScore;
  riskScore += layer3Data.nlpScore;

  // Blacklist check
  if (layer1Data.recipient) {
    const [blacklistedRecipient] = await app.db
      .select()
      .from(schema.recipientBlacklist)
      .where(
        and(
          eq(schema.recipientBlacklist.recipientIdentifier, layer1Data.recipient),
          eq(schema.recipientBlacklist.blacklistType, "GLOBAL")
        )
      )
      .limit(1);

    if (blacklistedRecipient) {
      breakdown.blacklistScore = 60;
      riskScore += 60;
    }
  }

  // Cap score at 100
  riskScore = Math.min(riskScore, 100);

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

  logger?.debug(
    { riskScore, riskLevel, breakdown },
    "Risk scoring completed"
  );

  return {
    status: riskScore >= 60 ? "FAIL" : "PASS",
    riskScore,
    riskLevel,
    breakdown,
  };
}

/**
 * Layer 6: Alert System
 */
export function layer6_alertSystem(riskLevel: string): Layer6Result {
  const alertLevelMap: Record<string, "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"> =
    {
      CRITICAL: "CRITICAL",
      HIGH: "HIGH",
      MEDIUM: "MEDIUM",
      LOW: "LOW",
    };

  const alertLevel = alertLevelMap[riskLevel] || "LOW";
  const shouldAlert =
    alertLevel === "CRITICAL" ||
    alertLevel === "HIGH" ||
    alertLevel === "MEDIUM";

  return {
    status: "PASS",
    alertLevel,
    shouldAlert,
  };
}

/**
 * Layer 7: Compliance & Audit Trail
 */
export async function layer7_auditTrail(
  app: App,
  userId: string,
  transactionId: string,
  allLayers: Omit<SecurityAnalysisResult, "totalProcessingTimeMs" | "overallStatus">,
  riskScore: number,
  alertGenerated: boolean,
  logger?: any
): Promise<Layer7Result> {
  try {
    const auditTrail: {
      timestamp: Date;
      layers: string[];
      riskScore: number;
      alertGenerated: boolean;
      complianceStatus: "COMPLIANT" | "REVIEW_REQUIRED";
    } = {
      timestamp: new Date(),
      layers: [
        "Layer 1: SMS Capture",
        "Layer 2: Input Validation",
        "Layer 3: Pattern Recognition",
        "Layer 4: Behavioral Analytics",
        "Layer 5: Risk Scoring",
        "Layer 6: Alert System",
        "Layer 7: Audit Trail",
      ],
      riskScore,
      alertGenerated,
      complianceStatus: alertGenerated ? "REVIEW_REQUIRED" : "COMPLIANT",
    };

    // Log to security layers log
    try {
      await app.db.insert(schema.securityLayersLog).values({
        transactionId: transactionId as any,
        userId,
        layerNumber: 7,
        layerName: "Compliance & Audit Trail",
        status: "PASS" as any,
        score: "100" as any,
        details: auditTrail,
        processingTimeMs: 10,
      });
    } catch (logError) {
      logger?.warn({ err: logError }, "Failed to log Layer 7");
    }

    logger?.info(
      { userId, transactionId, complianceStatus: auditTrail.complianceStatus },
      "Audit trail recorded"
    );

    return {
      status: "PASS",
      auditTrail,
    };
  } catch (error) {
    logger?.error(
      { err: error, userId, transactionId },
      "Failed to create audit trail"
    );
    throw error;
  }
}

/**
 * Execute all 7 layers of security analysis
 */
export async function executeSecurityAnalysis(
  app: App,
  userId: string,
  transactionId: string,
  smsMessage: string,
  logger?: any
): Promise<SecurityAnalysisResult> {
  const startTime = Date.now();

  try {
    // Layer 1: SMS Capture
    const layer1 = layer1_smsCaptureAndParsing(smsMessage);
    // Redact raw data for logging
    const redactedLayer1 = { ...layer1, rawData: "[REDACTED]" };
    await logSecurityLayer(app, userId, transactionId, 1, layer1.status === "PASS" ? "PASS" : "FAIL", 0, { parser_result: redactedLayer1 }, logger);

    // Layer 2: Input Validation
    const layer2 = layer2_inputValidation(layer1);
    await logSecurityLayer(app, userId, transactionId, 2, layer2.status === "PASS" ? "PASS" : "FAIL", 0, { validation_errors: layer2.validationErrors }, logger);

    if (layer2.status === "FAIL") {
      return {
        layer1,
        layer2,
        layer3: {
          status: "PASS",
          nlpScore: 0,
          scamKeywords: [],
          sentiment: "neutral",
        },
        layer4: {
          status: "PASS",
          velocityScore: 0,
          anomalyDetected: false,
          anomalyReason: null,
          userProfile: { avgAmount: null, isOutlier: false, lastTransactionTime: null },
        },
        layer5: {
          status: "FAIL",
          riskScore: 100,
          riskLevel: "CRITICAL",
          breakdown: {
            amountScore: 0,
            timeScore: 0,
            velocityScore: 0,
            blacklistScore: 0,
            roundAmountScore: 0,
            behaviorScore: 0,
            nlpScore: 0,
          },
        },
        layer6: { status: "PASS", alertLevel: "CRITICAL", shouldAlert: true },
        layer7: {
          status: "PASS",
          auditTrail: {
            timestamp: new Date(),
            layers: ["Layer 1-7"],
            riskScore: 100,
            alertGenerated: true,
            complianceStatus: "REVIEW_REQUIRED",
          },
        },
        totalProcessingTimeMs: Date.now() - startTime,
        overallStatus: "ALERT",
      };
    }

    // Layer 3: Pattern Recognition & NLP
    const layer3 = layer3_patternRecognitionNLP(smsMessage);
    await logSecurityLayer(app, userId, transactionId, 3, layer3.status, layer3.nlpScore, { keywords: layer3.scamKeywords, sentiment: layer3.sentiment }, logger);

    // Layer 4: Behavioral Analytics
    const layer4 = await layer4_behavioralAnalytics(app, userId, layer1);
    await logSecurityLayer(app, userId, transactionId, 4, layer4.status, layer4.velocityScore, { anomaly: layer4.anomalyDetected, reason: layer4.anomalyReason }, logger);

    // Layer 5: Risk Scoring
    const layer5 = await layer5_riskScoringEngine(
      app,
      userId,
      layer1,
      layer3,
      layer4,
      logger
    );
    await logSecurityLayer(app, userId, transactionId, 5, layer5.status, layer5.riskScore, { risk_level: layer5.riskLevel, breakdown: layer5.breakdown }, logger);

    // Layer 6: Alert System
    const layer6 = layer6_alertSystem(layer5.riskLevel);
    await logSecurityLayer(app, userId, transactionId, 6, layer6.status, 100, { alert_level: layer6.alertLevel }, logger);

    // Layer 7: Audit Trail
    const layer7 = await layer7_auditTrail(
      app,
      userId,
      transactionId,
      { layer1, layer2, layer3, layer4, layer5, layer6, layer7: { status: "PASS", auditTrail: { timestamp: new Date(), layers: [], riskScore: layer5.riskScore, alertGenerated: layer6.shouldAlert, complianceStatus: "COMPLIANT" } } } as any,
      layer5.riskScore,
      layer6.shouldAlert,
      logger
    );

    const totalTime = Date.now() - startTime;

    const overallStatus =
      layer5.riskLevel === "CRITICAL" || layer5.riskLevel === "HIGH"
        ? "ALERT"
        : layer4.anomalyDetected || layer3.scamKeywords.length > 0
          ? "WARNING"
          : "PASS";

    return {
      layer1,
      layer2,
      layer3,
      layer4,
      layer5,
      layer6,
      layer7,
      totalProcessingTimeMs: totalTime,
      overallStatus,
    };
  } catch (error) {
    logger?.error(
      { err: error, userId, transactionId },
      "Security analysis failed"
    );
    throw error;
  }
}

/**
 * Helper to log security layer results
 */
async function logSecurityLayer(
  app: App,
  userId: string,
  transactionId: string,
  layerNumber: number,
  status: "PASS" | "FAIL" | "WARNING",
  score: number,
  details: Record<string, any>,
  logger?: any
): Promise<void> {
  try {
    const layerNames = [
      "SMS Capture",
      "Input Validation",
      "Pattern Recognition",
      "Behavioral Analytics",
      "Risk Scoring",
      "Alert System",
      "Audit Trail",
    ];

    await app.db.insert(schema.securityLayersLog).values({
      transactionId: transactionId as any,
      userId,
      layerNumber,
      layerName: layerNames[layerNumber - 1],
      status,
      score: score as any,
      details,
      processingTimeMs: 0,
    });
  } catch (error) {
    logger?.warn(
      { err: error, layerNumber },
      "Failed to log security layer"
    );
  }
}
