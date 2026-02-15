/**
 * Advanced Multi-Transaction SMS Parser for Ghana MoMo Providers
 * Handles complex SMS with multiple transactions, flexible patterns, and various formats
 */

export interface Transaction {
  provider: "MTN" | "Telecel" | "Vodafone" | "AirtelTigo" | null;
  type: "sent" | "received" | "withdrawal" | "airtime" | "bill_payment" | "bundle" | "other" | null;
  amount: number | null;
  recipientName: string | null;
  recipientNumber: string | null;
  balance: number | null;
  fee: number | null;
  tax: number | null;
  eLevyCharge: number | null;
  reference: string | null;
  transactionId: string | null;
  transactionDate: string | null; // ISO 8601
  time: string | null; // HH:MM:SS
  rawSegment: string;
}

export interface ParseResult {
  transactions: Transaction[];
  totalTransactions: number;
  providers: Set<string>;
  parseErrors: string[];
}

/**
 * Split SMS into transaction segments
 * Looks for boundaries like periods after "Financial Transaction Id", new transactions starting with common patterns
 */
function splitIntoSegments(sms: string): string[] {
  // Split by common transaction delimiters
  let segments = sms.split(/(?=Your\s+(?:payment|new\s+balance)|Cash\s+Out|Payment\s+for|Confirmed\.\s+GHS|\d{13}\s+Confirmed)/i);

  // Also split by periods followed by capital letters that start new transactions
  let finalSegments: string[] = [];
  for (const segment of segments) {
    const parts = segment.split(/\.\s+(?=[A-Z].*(?:GHS|payment|Cash|Financial|Confirmed))/);
    finalSegments = finalSegments.concat(parts.filter(p => p.trim().length > 20));
  }

  return finalSegments
    .map(s => s.trim())
    .filter(s => s.length > 15 && (s.includes("GHS") || s.includes("₵")));
}

/**
 * Detect provider from segment
 */
function detectProvider(segment: string): "MTN" | "Telecel" | "Vodafone" | "AirtelTigo" | null {
  const upperSegment = segment.toUpperCase();

  if (upperSegment.includes("MTN")) {
    return "MTN";
  }
  if (upperSegment.includes("TELECEL")) {
    return "Telecel";
  }
  if (upperSegment.includes("VODAFONE")) {
    return "Vodafone";
  }
  if (upperSegment.includes("AIRTELTIGO")) {
    return "AirtelTigo";
  }

  return null;
}

/**
 * Detect transaction type from segment
 */
function detectType(segment: string): "sent" | "received" | "withdrawal" | "airtime" | "bill_payment" | "bundle" | "other" | null {
  const upper = segment.toUpperCase();

  if (upper.includes("RECEIVED") || upper.includes("CREDITED")) {
    return "received";
  }
  if (upper.includes("CASH OUT") || upper.includes("CASH-OUT") || upper.includes("WITHDRAWAL")) {
    return "withdrawal";
  }
  if (upper.includes("AIRTIME")) {
    return "airtime";
  }
  if (upper.includes("BUNDLE")) {
    return "bundle";
  }
  if (upper.includes("BILL") || upper.includes("PAID TO ECG") || upper.includes("PAID TO GHANA WATER")) {
    return "bill_payment";
  }
  if (upper.includes("PAYMENT") || upper.includes("PAID TO") || upper.includes("PAID") || upper.includes("TO")) {
    return "sent";
  }

  return "other";
}

/**
 * Extract amount from segment - flexible pattern matching
 */
function extractAmount(segment: string): number | null {
  // Try multiple patterns
  const patterns = [
    /GHS\s*([\d.]+)/i,           // "GHS 3.00"
    /₵\s*([\d.]+)/,              // "₵3.00"
    /GH₵\s*([\d.]+)/,            // "GH₵3.00"
    /of\s+(?:GHS|₵)?\s*([\d.]+)/i, // "of GHS 3.00" or "of 3.00"
  ];

  for (const pattern of patterns) {
    const match = segment.match(pattern);
    if (match) {
      const amount = parseFloat(match[1]);
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }
  }

  return null;
}

/**
 * Extract recipient from segment
 */
function extractRecipient(segment: string): { name: string | null; number: string | null } {
  // Pattern 1: "to XXXX - NAME" (e.g., "to 735000 - EXPRESSPAY")
  let match = segment.match(/to\s+(\d+)\s*-\s*(.+?)(?:\s+on\s+|\s+at\s+|$)/i);
  if (match) {
    return {
      number: match[1],
      name: match[2]?.trim() || null,
    };
  }

  // Pattern 2: "to NAME" (e.g., "to KEK FOOD VENDOR AND COSMETICS", "to MTN AIRTIME")
  match = segment.match(/to\s+([A-Z][A-Z\s&\-]+?)(?:\s+on\s+|\s+at\s+|\.|\s+has\s+|$)/i);
  if (match) {
    const name = match[1]?.trim();
    if (name && name.length > 2) {
      return {
        name,
        number: null,
      };
    }
  }

  // Pattern 3: Extract from "paid to" pattern
  match = segment.match(/paid\s+to\s+([A-Z][A-Z\s&\-]+?)(?:\s+on\s+|\s+at\s+|\.|\s+has\s+|$)/i);
  if (match) {
    const name = match[1]?.trim();
    if (name && name.length > 2) {
      return {
        name,
        number: null,
      };
    }
  }

  return { name: null, number: null };
}

/**
 * Extract balance from segment
 */
function extractBalance(segment: string): number | null {
  // Try multiple patterns
  const patterns = [
    /(?:Your\s+new\s+|new\s+)?Telecel\s+Cash\s+balance\s+is\s+GHS\s*([\d.]+)/i,
    /Your\s+new\s+balance[:\s]+GHS\s*([\d.]+)/i,
    /[Cc]urrent\s+[Bb]alance[:\s]+GHS\s*([\d.]+)/i,
    /balance\s+is\s+GHS\s*([\d.]+)/i,
  ];

  for (const pattern of patterns) {
    const match = segment.match(pattern);
    if (match) {
      const balance = parseFloat(match[1]);
      if (!isNaN(balance)) {
        return balance;
      }
    }
  }

  return null;
}

/**
 * Extract fee from segment
 */
function extractFee(segment: string): number | null {
  const patterns = [
    /Fee\s+(?:was|charged)[:\s]+GHS\s*([\d.-]+)/i,
    /You\s+were\s+charged\s+GHS\s*([\d.-]+)/i,
    /(?:cash-out\s+)?fee\s+(?:is\s+)?charged[:\s]+(?:automatically\s+from\s+)?.*?GHS\s*([\d.-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = segment.match(pattern);
    if (match) {
      if (match[1] === "-") return 0;
      const fee = parseFloat(match[1]);
      if (!isNaN(fee)) {
        return fee;
      }
    }
  }

  return null;
}

/**
 * Extract tax from segment
 */
function extractTax(segment: string): number | null {
  const patterns = [
    /Tax\s+(?:was|[Cc]harged)[:\s]+GHS\s*([\d.-]+)/i,
    /Tax\s+[Cc]harged\s+([\d.-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = segment.match(pattern);
    if (match) {
      if (match[1] === "-") return 0;
      const tax = parseFloat(match[1]);
      if (!isNaN(tax)) {
        return tax;
      }
    }
  }

  return null;
}

/**
 * Extract e-levy charge from segment
 */
function extractELevyCharge(segment: string): number | null {
  const match = segment.match(/E-levy\s+charge\s+is\s+GHS\s*([\d.-]+)/i);
  if (match) {
    if (match[1] === "-") return 0;
    const levy = parseFloat(match[1]);
    if (!isNaN(levy)) {
      return levy;
    }
  }

  return null;
}

/**
 * Extract reference/transaction ID
 */
function extractReference(segment: string): { id: string | null; reference: string | null } {
  // Financial Transaction Id (priority)
  let match = segment.match(/Financial\s+Transaction\s+Id[:\s]+(\d+)/i);
  if (match) {
    return { id: match[1], reference: null };
  }

  // Transaction Id
  match = segment.match(/Transaction\s+Id[:\s]+(\d+)/i);
  if (match) {
    return { id: match[1], reference: null };
  }

  // Reference (non-numeric)
  match = segment.match(/Reference[:\s]+([a-zA-Z0-9\-._]+)/i);
  if (match && match[1] !== "-") {
    return { id: null, reference: match[1] };
  }

  // 13-digit leading ID
  match = segment.match(/^(\d{13})/);
  if (match) {
    return { id: match[1], reference: null };
  }

  return { id: null, reference: null };
}

/**
 * Extract timestamp from segment
 */
function extractTimestamp(segment: string): { date: string | null; time: string | null } {
  // Pattern 1: "at 2026-02-13 16:52:00" or "at 2026-02-13 HH:MM:SS"
  let match = segment.match(/at\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/i);
  if (match) {
    return { date: match[1], time: match[2] };
  }

  // Pattern 2: "on 2026-02-13 at 16:52:30"
  match = segment.match(/on\s+(\d{4}-\d{2}-\d{2})\s+at\s+(\d{2}:\d{2}:\d{2})/i);
  if (match) {
    return { date: match[1], time: match[2] };
  }

  // Pattern 3: Just time "HH:MM:SS"
  match = segment.match(/at\s+(\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    return { date: null, time: `${match[1]}:${match[2]}:${match[3]}` };
  }

  return { date: null, time: null };
}

/**
 * Parse a single transaction segment
 */
function parseSegment(segment: string): Transaction {
  const provider = detectProvider(segment);
  const type = detectType(segment);
  const amount = extractAmount(segment);
  const recipient = extractRecipient(segment);
  const balance = extractBalance(segment);
  const fee = extractFee(segment);
  const tax = extractTax(segment);
  const eLevyCharge = extractELevyCharge(segment);
  const { id: transactionId, reference } = extractReference(segment);
  const { date: transactionDate, time } = extractTimestamp(segment);

  return {
    provider,
    type,
    amount,
    recipientName: recipient.name,
    recipientNumber: recipient.number,
    balance,
    fee,
    tax,
    eLevyCharge,
    reference,
    transactionId,
    transactionDate,
    time,
    rawSegment: segment,
  };
}

/**
 * Main parser function - handles multi-transaction SMS
 */
export function parseMultiTransaction(sms: string): ParseResult {
  const segments = splitIntoSegments(sms);
  const transactions: Transaction[] = [];
  const providers = new Set<string>();
  const parseErrors: string[] = [];

  // Parse each segment
  for (const segment of segments) {
    if (segment.trim().length < 15) continue;

    const transaction = parseSegment(segment);

    // Only add if it has meaningful data
    if (transaction.amount || transaction.provider) {
      transactions.push(transaction);
      if (transaction.provider) {
        providers.add(transaction.provider);
      }
    }
  }

  // Validate we found at least some transactions
  if (transactions.length === 0) {
    parseErrors.push("No valid transactions found in SMS");
  }

  return {
    transactions,
    totalTransactions: transactions.length,
    providers,
    parseErrors,
  };
}

/**
 * Parse a single transaction (backward compatible with old interface)
 * Returns the first transaction found, or a minimal transaction
 */
export function parseSingleTransaction(sms: string): Transaction {
  const result = parseMultiTransaction(sms);

  if (result.transactions.length > 0) {
    return result.transactions[0];
  }

  // Return empty transaction if nothing found
  return {
    provider: null,
    type: null,
    amount: null,
    recipientName: null,
    recipientNumber: null,
    balance: null,
    fee: null,
    tax: null,
    eLevyCharge: null,
    reference: null,
    transactionId: null,
    transactionDate: null,
    time: null,
    rawSegment: sms,
  };
}
