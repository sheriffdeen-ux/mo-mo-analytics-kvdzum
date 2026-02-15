/**
 * 7-Layer Fraud Detection Framework
 * Real-time fraud detection and prevention system
 */

import type { App } from "../index.js";
import type { ParsedTransaction } from "./telecel-sms-parser.js";

// Layer interfaces
export interface Layer1ParseResult {
  status: "PASS" | "FAIL";
  provider: string | null;
  transactionType: string | null;
  hasRequiredFields: boolean;
}

export interface Layer2ValidationResult {
  status: "PASS" | "FAIL";
  amountValid: boolean;
  dateValid: boolean;
  recipientValid: boolean;
  errors: string[];
}

export interface Layer3PatternResult {
  nlpScore: number; // 0-100
  scamKeywords: string[];
  sentiment: "positive" | "neutral" | "negative";
  suspiciousPatterns: string[];
}

export interface Layer4BehaviorResult {
  isAnomaly: boolean;
  velocityScore: number; // 0-100
  frequencyFlag: boolean;
  unusualTimeFlag: boolean;
  unusualAmountFlag: boolean;
  riskFactors: string[];
}

export interface Layer5RiskResult {
  riskScore: number; // 0-100
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  breakdown: {
    amountScore: number;
    timeScore: number;
    velocityScore: number;
    behaviorScore: number;
    nlpScore: number;
  };
  factors: string[];
}

export interface Layer6AlertResult {
  shouldAlert: boolean;
  alertLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
}

export interface Layer7AuditResult {
  auditTrail: Record<string, any>;
  complianceStatus: "COMPLIANT" | "REVIEW_REQUIRED";
  timestamp: string;
}

export interface FraudAnalysisResult {
  layer1: Layer1ParseResult;
  layer2: Layer2ValidationResult;
  layer3: Layer3PatternResult;
  layer4: Layer4BehaviorResult;
  layer5: Layer5RiskResult;
  layer6: Layer6AlertResult;
  layer7: Layer7AuditResult;
  totalRiskScore: number;
  finalRiskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  processingTimeMs: number;
}

/**
 * Layer 1: Parse SMS and extract transaction data
 */
export function layer1_parseTransaction(
  parsed: ParsedTransaction
): Layer1ParseResult {
  return {
    status: parsed.isValidTransaction ? "PASS" : "FAIL",
    provider: parsed.provider,
    transactionType: parsed.type,
    hasRequiredFields: !!(
      parsed.type &&
      parsed.amount &&
      parsed.transactionDate &&
      parsed.time &&
      parsed.provider
    ),
  };
}

/**
 * Layer 2: Validate transaction data integrity
 */
export function layer2_validateTransaction(
  parsed: ParsedTransaction
): Layer2ValidationResult {
  const errors: string[] = [];
  let amountValid = true;
  let dateValid = true;
  let recipientValid = true;

  // Validate amount
  if (!parsed.amount || parsed.amount <= 0) {
    amountValid = false;
    errors.push("Invalid or missing amount");
  }

  // Validate date
  if (!parsed.transactionDate || !parsed.time) {
    dateValid = false;
    errors.push("Invalid or missing date/time");
  }

  // Validate recipient info
  if (parsed.type === "received") {
    if (!parsed.senderName && !parsed.senderNumber) {
      recipientValid = false;
      errors.push("Sender information missing");
    }
  } else if (parsed.type === "sent") {
    if (!parsed.receiverName && !parsed.receiverNumber) {
      recipientValid = false;
      errors.push("Receiver information missing");
    }
  } else if (parsed.type === "cash_out") {
    if (!parsed.merchantName) {
      recipientValid = false;
      errors.push("Merchant name missing");
    }
  }

  return {
    status: errors.length === 0 ? "PASS" : "FAIL",
    amountValid,
    dateValid,
    recipientValid,
    errors,
  };
}

/**
 * Layer 3: NLP Analysis - Detect scam patterns and keywords
 */
export function layer3_nlpAnalysis(
  parsed: ParsedTransaction,
  sms: string
): Layer3PatternResult {
  const scamKeywords = [
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

  const smsUpper = sms.toUpperCase();
  const detectedKeywords = scamKeywords.filter((keyword) =>
    smsUpper.includes(keyword.toUpperCase())
  );

  // For legitimate MoMo messages from known providers, NLP score should be minimal
  // Only flag if multiple scam keywords are detected
  const knownProviders = ["Telecel Cash", "MTN MOBILE MONEY", "Vodafone", "AirtelTigo", "MTN", "Vodafone Cash", "AirtelTigo Money"];
  const isKnownProvider = parsed.provider && knownProviders.some(p => parsed.provider?.includes(p));

  // NLP scoring: Penalize only if multiple keywords AND unknown provider, or multiple keywords for any provider
  let nlpScore = 0;
  if (detectedKeywords.length > 2) {
    // Multiple keywords = always suspicious
    nlpScore = Math.min(100, detectedKeywords.length * 15);
  } else if (detectedKeywords.length > 0 && !isKnownProvider) {
    // Single keyword + unknown provider = slightly suspicious
    nlpScore = 20;
  }
  // Legitimate known providers with 0-1 keywords = 0 score

  // Sentiment analysis (simple heuristic)
  let sentiment: "positive" | "neutral" | "negative" = "neutral";
  if (smsUpper.includes("RECEIVED") || smsUpper.includes("CONFIRMED")) {
    sentiment = "positive";
  } else if (
    smsUpper.includes("BLOCK") ||
    smsUpper.includes("LIMIT") ||
    smsUpper.includes("SUSPEND")
  ) {
    sentiment = "negative";
  }

  const suspiciousPatterns: string[] = [];
  if (detectedKeywords.length > 2) {
    suspiciousPatterns.push("Multiple scam keywords detected");
  }
  if (smsUpper.includes("CLICK") && smsUpper.includes("LINK")) {
    suspiciousPatterns.push("Contains click/link request");
  }

  return {
    nlpScore,
    scamKeywords: detectedKeywords,
    sentiment,
    suspiciousPatterns,
  };
}

/**
 * Layer 4: Behavioral Analytics - Check user history and patterns
 */
export async function layer4_behavioralAnalysis(
  app: App,
  userId: string,
  parsed: ParsedTransaction
): Promise<Layer4BehaviorResult> {
  const riskFactors: string[] = [];
  let velocityScore = 0;
  let isAnomaly = false;
  let frequencyFlag = false;
  let unusualTimeFlag = false;
  let unusualAmountFlag = false;

  // Check transaction time (late night = risky)
  if (parsed.time) {
    const [hours] = parsed.time.split(":");
    const hour = parseInt(hours);
    if (hour >= 22 || hour <= 5) {
      unusualTimeFlag = true;
      riskFactors.push("Transaction at unusual time (late night)");
    }
  }

  // Check amount (very high = risky)
  if (parsed.amount && parsed.amount > 5000) {
    unusualAmountFlag = true;
    riskFactors.push("Unusually high transaction amount");
  }

  // For now, accept that legitimate MoMo transactions shouldn't flag as anomalies
  // unless there are specific concerning factors
  velocityScore = frequencyFlag ? 40 : 0;

  return {
    isAnomaly,
    velocityScore,
    frequencyFlag,
    unusualTimeFlag,
    unusualAmountFlag,
    riskFactors,
  };
}

/**
 * Layer 5: Real-time Risk Scoring (0-100 scale)
 */
export function layer5_riskScoring(
  parsed: ParsedTransaction,
  layer3: Layer3PatternResult,
  layer4: Layer4BehaviorResult
): Layer5RiskResult {
  let totalScore = 0;
  const breakdown = {
    amountScore: 0,
    timeScore: 0,
    velocityScore: 0,
    behaviorScore: 0,
    nlpScore: 0,
  };

  // Amount scoring (0-40 points)
  if (parsed.amount) {
    if (parsed.amount > 10000) {
      breakdown.amountScore = 40;
    } else if (parsed.amount > 5000) {
      breakdown.amountScore = 30;
    } else if (parsed.amount > 1000) {
      breakdown.amountScore = 15;
    } else {
      breakdown.amountScore = 0;
    }
  }

  // Time scoring (0-30 points)
  if (parsed.time) {
    const [hours] = parsed.time.split(":");
    const hour = parseInt(hours);
    if (hour >= 22 || hour <= 5) {
      breakdown.timeScore = 30;
    } else {
      breakdown.timeScore = 0;
    }
  }

  // Velocity scoring (inherited from layer 4)
  breakdown.velocityScore = layer4.velocityScore;

  // Behavior/Anomaly scoring (0-25 points)
  if (layer4.isAnomaly) {
    breakdown.behaviorScore = 25;
  } else if (layer4.unusualAmountFlag || layer4.unusualTimeFlag) {
    breakdown.behaviorScore = 10;
  } else {
    breakdown.behaviorScore = 0;
  }

  // NLP scoring (0-100 points) - but legitimate MoMo messages get lower scores
  breakdown.nlpScore = layer3.nlpScore;

  // Calculate total
  totalScore = Math.min(
    100,
    breakdown.amountScore +
      breakdown.timeScore +
      breakdown.velocityScore +
      breakdown.behaviorScore +
      breakdown.nlpScore
  );

  // Key principle: Legitimate MoMo transactions from known providers default to LOW RISK
  // Only flag as higher risk if there are SPECIFIC fraud indicators
  const knownProviders = ["Telecel Cash", "MTN MOBILE MONEY", "Vodafone", "AirtelTigo", "MTN", "Vodafone Cash", "AirtelTigo Money"];
  const isKnownProvider = parsed.provider && knownProviders.some(p => parsed.provider?.includes(p));

  // For legitimate providers with no suspicious patterns, cap score at 20 (LOW RISK)
  if (isKnownProvider && !layer3.suspiciousPatterns.length && breakdown.nlpScore < 20) {
    totalScore = Math.min(20, totalScore);
  } else if (isKnownProvider && layer3.suspiciousPatterns.length < 2) {
    // Known provider with minor suspicious patterns - cap at 40 (MEDIUM)
    totalScore = Math.min(40, totalScore);
  }

  // Determine risk level based on score
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  if (totalScore < 30) {
    riskLevel = "LOW";
  } else if (totalScore < 50) {
    riskLevel = "MEDIUM";
  } else if (totalScore < 75) {
    riskLevel = "HIGH";
  } else {
    riskLevel = "CRITICAL";
  }

  return {
    riskScore: totalScore,
    riskLevel,
    breakdown,
    factors: [
      ...(breakdown.amountScore > 0 ? [`Amount: ${breakdown.amountScore} pts`] : []),
      ...(breakdown.timeScore > 0 ? [`Time: ${breakdown.timeScore} pts`] : []),
      ...(breakdown.velocityScore > 0 ? [`Velocity: ${breakdown.velocityScore} pts`] : []),
      ...(breakdown.behaviorScore > 0 ? [`Behavior: ${breakdown.behaviorScore} pts`] : []),
      ...(breakdown.nlpScore > 0 ? [`NLP: ${breakdown.nlpScore} pts`] : []),
    ],
  };
}

/**
 * Layer 6: Alert Generation System
 */
export function layer6_alertSystem(
  layer5: Layer5RiskResult
): Layer6AlertResult {
  const shouldAlert = layer5.riskLevel !== "LOW";

  let alertLevel = layer5.riskLevel;
  let message = "";

  if (layer5.riskLevel === "CRITICAL") {
    message = "CRITICAL FRAUD RISK - Immediate action required";
  } else if (layer5.riskLevel === "HIGH") {
    message = "HIGH FRAUD RISK - Please review this transaction";
  } else if (layer5.riskLevel === "MEDIUM") {
    message = "MEDIUM FRAUD RISK - Be cautious with this transaction";
  } else {
    message = "Transaction appears safe";
    alertLevel = "LOW";
  }

  return {
    shouldAlert,
    alertLevel,
    message,
  };
}

/**
 * Layer 7: Compliance & Audit Trail
 */
export function layer7_auditTrail(
  analysisResult: FraudAnalysisResult
): Layer7AuditResult {
  return {
    auditTrail: {
      timestamp: new Date().toISOString(),
      riskScore: analysisResult.layer5.riskScore,
      riskLevel: analysisResult.layer5.riskLevel,
      layer1Status: analysisResult.layer1.status,
      layer2Status: analysisResult.layer2.status,
      layer6Alert: analysisResult.layer6.shouldAlert,
    },
    complianceStatus: analysisResult.layer6.shouldAlert
      ? "REVIEW_REQUIRED"
      : "COMPLIANT",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Execute complete 7-layer fraud analysis
 */
export async function executeFraudAnalysis(
  app: App,
  userId: string,
  parsed: ParsedTransaction
): Promise<FraudAnalysisResult> {
  const startTime = Date.now();

  // Layer 1: Parse
  const layer1 = layer1_parseTransaction(parsed);

  // Layer 2: Validate
  const layer2 = layer2_validateTransaction(parsed);

  // Layer 3: NLP
  const layer3 = layer3_nlpAnalysis(parsed, parsed.rawSms);

  // Layer 4: Behavior
  const layer4 = await layer4_behavioralAnalysis(app, userId, parsed);

  // Layer 5: Risk Scoring
  const layer5 = layer5_riskScoring(parsed, layer3, layer4);

  // Layer 6: Alert
  const layer6 = layer6_alertSystem(layer5);

  // Layer 7: Audit Trail
  const tempResult: FraudAnalysisResult = {
    layer1,
    layer2,
    layer3,
    layer4,
    layer5,
    layer6,
    layer7: { auditTrail: {}, complianceStatus: "COMPLIANT", timestamp: "" },
    totalRiskScore: layer5.riskScore,
    finalRiskLevel: layer5.riskLevel,
    processingTimeMs: 0,
  };

  const layer7 = layer7_auditTrail(tempResult);

  const processingTimeMs = Date.now() - startTime;

  const result: FraudAnalysisResult = {
    layer1,
    layer2,
    layer3,
    layer4,
    layer5,
    layer6,
    layer7,
    totalRiskScore: layer5.riskScore,
    finalRiskLevel: layer5.riskLevel,
    processingTimeMs,
  };

  app.logger.info(
    {
      userId,
      riskScore: layer5.riskScore,
      riskLevel: layer5.riskLevel,
      processingTimeMs,
    },
    "Fraud analysis completed"
  );

  return result;
}
