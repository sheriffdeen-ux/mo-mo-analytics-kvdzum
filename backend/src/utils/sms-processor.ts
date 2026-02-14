/**
 * SMS Processing Utility
 * Handles SMS parsing and extraction of transaction information
 */

export interface ParsedSmsTransaction {
  amount: number;
  transactionType: "sent" | "received" | "withdrawal" | "deposit";
  reference?: string;
  timestamp: Date;
  recipient?: string;
  provider: "MTN" | "Vodafone" | "AirtelTigo";
  balance?: number;
  rawContent: string;
}

/**
 * Extract transaction info from SMS content
 */
export function parseSmsTransaction(
  smsContent: string
): Partial<ParsedSmsTransaction> {
  const result: Partial<ParsedSmsTransaction> = {
    rawContent: smsContent,
  };

  // Detect provider from content
  if (smsContent.includes("MTN")) {
    result.provider = "MTN";
  } else if (smsContent.includes("Vodafone")) {
    result.provider = "Vodafone";
  } else if (smsContent.includes("AirtelTigo") || smsContent.includes("Airteltigo")) {
    result.provider = "AirtelTigo";
  }

  // Extract amount (look for GHS or common patterns)
  const amountMatch = smsContent.match(/GHS\s*([0-9,]+\.?\d*)/i);
  if (amountMatch) {
    result.amount = parseFloat(amountMatch[1].replace(/,/g, ""));
  }

  // Extract reference/transaction ID
  const refMatch = smsContent.match(/(?:Ref|Reference|ID|TxnID)[\s:]*([A-Z0-9]+)/i);
  if (refMatch) {
    result.reference = refMatch[1];
  }

  // Extract recipient
  const recipientMatch = smsContent.match(/(?:to|from)\s+([A-Za-z\s]+?)(?:\.|,|$)/i);
  if (recipientMatch) {
    result.recipient = recipientMatch[1].trim();
  }

  // Detect transaction type
  if (smsContent.match(/sent|transferred|sent to/i)) {
    result.transactionType = "sent";
  } else if (smsContent.match(/received|credited|received from|received money/i)) {
    result.transactionType = "received";
  } else if (smsContent.match(/withdraw|withdrawn/i)) {
    result.transactionType = "withdrawal";
  } else if (smsContent.match(/deposit|deposited/i)) {
    result.transactionType = "deposit";
  }

  // Extract balance if present
  const balanceMatch = smsContent.match(/balance[\s:]*GHS\s*([0-9,]+\.?\d*)/i);
  if (balanceMatch) {
    result.balance = parseFloat(balanceMatch[1].replace(/,/g, ""));
  }

  // Set timestamp to now if not found
  result.timestamp = new Date();

  return result;
}

/**
 * Validate if parsed transaction has required fields
 */
export function isValidTransaction(
  transaction: Partial<ParsedSmsTransaction>
): transaction is ParsedSmsTransaction {
  return (
    typeof transaction.amount === "number" &&
    transaction.amount > 0 &&
    typeof transaction.transactionType === "string" &&
    ["sent", "received", "withdrawal", "deposit"].includes(
      transaction.transactionType
    ) &&
    transaction.timestamp instanceof Date &&
    typeof transaction.provider === "string" &&
    ["MTN", "Vodafone", "AirtelTigo"].includes(transaction.provider)
  );
}

/**
 * Detect if SMS should be stored (based on fraud detection rules)
 */
export function shouldStoreSms(
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  riskScore: number
): boolean {
  // Store SMS for all fraud levels (we always keep audit trail)
  return true;
}

/**
 * Format transaction details for display in reply
 */
export function formatTransactionForReply(
  amount: number,
  reference: string,
  type: "sent" | "received" | "withdrawal" | "deposit",
  timestamp: Date
): string {
  const action =
    type === "sent" ? "Sent" : type === "received" ? "Received" : "Withdrawal";
  const timeStr = timestamp.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return `${action} GHS ${amount.toFixed(2)} (Ref: ${reference}) at ${timeStr}`;
}

/**
 * Format daily summary for SMS reply
 */
export function formatDailySummary(
  totalSent: number,
  totalReceived: number
): string {
  return `Today: Sent GHS ${totalSent.toFixed(2)}, Received GHS ${totalReceived.toFixed(2)}`;
}

/**
 * Check if SMS content is relevant for fraud detection
 */
export function isRelevantSms(smsContent: string): boolean {
  // Check if SMS contains transaction-related keywords
  const keywords = [
    "transaction",
    "sent",
    "received",
    "credit",
    "debit",
    "momo",
    "transfer",
    "withdraw",
    "deposit",
    "balance",
    "GHS",
  ];

  const lowerContent = smsContent.toLowerCase();
  return keywords.some((keyword) => lowerContent.includes(keyword));
}
