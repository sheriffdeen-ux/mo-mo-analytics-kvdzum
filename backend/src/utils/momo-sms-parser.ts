/**
 * Enhanced MoMo SMS Parser for Ghana
 * Supports: MTN MoMo, Vodafone Cash, AirtelTigo Money
 */

export interface ParsedMoMoTransaction {
  provider: "MTN" | "Vodafone" | "AirtelTigo" | null;
  transactionType:
    | "sent"
    | "received"
    | "withdrawal"
    | "deposit"
    | "airtime"
    | "bill_payment"
    | null;
  amount: number | null;
  recipient: string | null;
  time: string | null;
  date: string | null;
  referenceNumber: string | null;
  balance: number | null;
  rawSms: string;
  isValidTransaction: boolean;
  parseErrors: string[];
}

/**
 * Extract time in HH:MM AM/PM format
 */
function extractAndFormatTime(sms: string): string | null {
  // Try 24-hour format first
  const match24h = sms.match(/(\d{1,2}):(\d{2})/);
  if (match24h) {
    const hour = parseInt(match24h[1]);
    const minute = match24h[2];
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute} ${period}`;
  }

  // Try AM/PM format
  const matchAmPm = sms.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (matchAmPm) {
    const hour = parseInt(matchAmPm[1]);
    const minute = matchAmPm[2];
    const period = matchAmPm[3].toUpperCase();
    return `${hour}:${minute} ${period}`;
  }

  return null;
}

/**
 * Get current date in DD/MM/YYYY format
 */
function getCurrentDate(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Extract phone number (recipient/sender)
 */
function extractPhoneNumber(sms: string): string | null {
  // Ghana phone numbers: 0XX XXXXXXX or +233XX XXXXXXX
  const patterns = [
    /\b(0\d{2}\s?\d{7})\b/, // 024 1234567
    /\b(0\d{9})\b/, // 0241234567
    /\+233\d{9}/, // +2330241234567
    /to\s+([0-9\s]+)\b/i, // to 024 1234567
    /from\s+([0-9\s]+)\b/i, // from 024 1234567
  ];

  for (const pattern of patterns) {
    const match = sms.match(pattern);
    if (match) {
      return match[1] || match[0].replace(/to|from/i, "").trim();
    }
  }

  return null;
}

/**
 * Extract amount with GHS currency
 */
function extractAmount(sms: string): number | null {
  const patterns = [
    /GHS\s*([0-9,]+\.?\d*)/i,
    /amount\s*[:\s]*GHS\s*([0-9,]+\.?\d*)/i,
    /sent.*?([0-9,]+\.?\d*)/i,
    /received.*?([0-9,]+\.?\d*)/i,
  ];

  for (const pattern of patterns) {
    const match = sms.match(pattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, "");
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }
  }

  return null;
}

/**
 * Extract reference number
 */
function extractReferenceNumber(sms: string): string | null {
  const patterns = [
    /(?:Ref|Reference|RefID|Ref ID|TXN|Transaction ID|ID)[:\s]+([A-Z0-9]+)/i,
    /\b([A-Z]{3}\d{6,})\b/, // MTN123456
    /\b([0-9]{10,})\b/, // 1234567890
  ];

  for (const pattern of patterns) {
    const match = sms.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract balance
 */
function extractBalance(sms: string): number | null {
  const patterns = [
    /balance[:\s]+GHS\s*([0-9,]+\.?\d*)/i,
    /New Balance[:\s]+GHS\s*([0-9,]+\.?\d*)/i,
    /your new balance[:\s]+GHS\s*([0-9,]+\.?\d*)/i,
  ];

  for (const pattern of patterns) {
    const match = sms.match(pattern);
    if (match) {
      const balanceStr = match[1].replace(/,/g, "");
      const balance = parseFloat(balanceStr);
      if (!isNaN(balance)) {
        return balance;
      }
    }
  }

  return null;
}

/**
 * Detect provider
 */
function detectProvider(sms: string): "MTN" | "Vodafone" | "AirtelTigo" | null {
  const upper = sms.toUpperCase();

  if (upper.includes("MTN") || upper.includes("MOMO") || upper.includes("MOBILE MONEY")) {
    return "MTN";
  }
  if (upper.includes("VODAFONE")) {
    return "Vodafone";
  }
  if (upper.includes("AIRTELTIGO") || upper.includes("AIRTEL") || upper.includes("TIGO")) {
    return "AirtelTigo";
  }

  return null;
}

/**
 * Detect transaction type
 */
function detectTransactionType(
  sms: string
): "sent" | "received" | "withdrawal" | "deposit" | "airtime" | "bill_payment" | null {
  const upper = sms.toUpperCase();

  if (upper.includes("SENT") || upper.includes("TRANSFERRED") || upper.includes("SENT TO")) {
    return "sent";
  }
  if (
    upper.includes("RECEIVED") ||
    upper.includes("CREDITED") ||
    upper.includes("RECEIVED FROM")
  ) {
    return "received";
  }
  if (upper.includes("WITHDRAW") || upper.includes("WITHDRAWAL")) {
    return "withdrawal";
  }
  if (upper.includes("DEPOSIT") || upper.includes("DEPOSITED")) {
    return "deposit";
  }
  if (
    upper.includes("AIRTIME") ||
    upper.includes("AIR TIME") ||
    upper.includes("RECHARGE")
  ) {
    return "airtime";
  }
  if (upper.includes("BILL PAYMENT") || upper.includes("PAYMENT")) {
    return "bill_payment";
  }

  return null;
}

/**
 * Parse MoMo SMS
 */
export function parseMoMoSms(sms: string): ParsedMoMoTransaction {
  const errors: string[] = [];

  const provider = detectProvider(sms);
  const transactionType = detectTransactionType(sms);
  const amount = extractAmount(sms);
  const recipient = extractPhoneNumber(sms);
  const time = extractAndFormatTime(sms);
  const referenceNumber = extractReferenceNumber(sms);
  const balance = extractBalance(sms);
  const date = getCurrentDate();

  // Validate it's a real transaction
  const isValid = !!(provider && transactionType && amount && recipient);

  if (!provider) errors.push("Provider not detected");
  if (!transactionType) errors.push("Transaction type not detected");
  if (!amount) errors.push("Amount not found");
  if (!recipient) errors.push("Recipient/sender not found");

  return {
    provider,
    transactionType,
    amount,
    recipient,
    time,
    date,
    referenceNumber,
    balance,
    rawSms: sms,
    isValidTransaction: isValid,
    parseErrors: errors,
  };
}

/**
 * Validate if SMS is a MoMo transaction
 */
export function isMoMoTransaction(sms: string): boolean {
  const parsed = parseMoMoSms(sms);
  return parsed.isValidTransaction;
}
