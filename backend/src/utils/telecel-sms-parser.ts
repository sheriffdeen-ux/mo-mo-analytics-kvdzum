/**
 * Enhanced SMS Parser for Telecel Cash and Ghana MoMo Providers
 * Handles multiple SMS formats from Telecel Cash, MTN, Vodafone, etc.
 */

export interface ParsedTransaction {
  transactionId: string | null;
  type: "received" | "sent" | "cash_out" | null;
  amount: number | null;
  senderName: string | null;
  senderNumber: string | null;
  receiverName: string | null;
  receiverNumber: string | null;
  merchantName: string | null;
  transactionDate: string | null; // YYYY-MM-DD
  time: string | null; // HH:MM:SS
  balance: number | null;
  fee: number | null;
  eLevy: number | null;
  provider: string | null;
  rawSms: string;
  isValidTransaction: boolean;
  parseErrors: string[];
}

/**
 * Detect transaction type from SMS content
 */
function detectTransactionType(sms: string): "received" | "sent" | "cash_out" | null {
  const smsUpper = sms.toUpperCase();

  // Check for received transaction
  if (smsUpper.includes("RECEIVED") || smsUpper.includes("YOU HAVE RECEIVED")) {
    return "received";
  }

  // Check for sent transaction
  if (
    smsUpper.includes("SENT") &&
    !smsUpper.includes("RECEIVED") &&
    smsUpper.includes("TO")
  ) {
    return "sent";
  }

  // Check for cash out
  if (smsUpper.includes("CASH OUT")) {
    return "cash_out";
  }

  return null;
}

/**
 * Detect provider from SMS content
 */
function detectProvider(sms: string): string | null {
  const smsUpper = sms.toUpperCase();

  if (smsUpper.includes("TELECEL CASH")) {
    return "Telecel Cash";
  }
  if (smsUpper.includes("MTN MOBILE MONEY") || smsUpper.includes("MTN MOMO")) {
    return "MTN MOBILE MONEY";
  }
  if (smsUpper.includes("VODAFONE CASH")) {
    return "Vodafone Cash";
  }
  if (smsUpper.includes("AIRTELTIGO")) {
    return "AirtelTigo Money";
  }

  return null;
}

/**
 * Extract transaction ID/reference number
 */
function extractTransactionId(sms: string): string | null {
  // Pattern 1: Leading 13-digit reference (e.g., "0000012062913379")
  const leadingRef = sms.match(/^(\d{13})/);
  if (leadingRef) {
    return leadingRef[1];
  }

  // Pattern 2: "Financial Transaction Id: xxxxxx"
  const financialRef = sms.match(/Financial\s+Transaction\s+Id[:\s]+(\d+)/i);
  if (financialRef) {
    return financialRef[1];
  }

  // Pattern 3: "transaction reference: xxxxx"
  const refPattern = sms.match(/transaction\s+reference[:\s]+([a-zA-Z0-9]+)/i);
  if (refPattern) {
    return refPattern[1];
  }

  // Pattern 4: "Ref: xxxxx"
  const refShort = sms.match(/\bRef[:\s]+([a-zA-Z0-9]+)/i);
  if (refShort) {
    return refShort[1];
  }

  return null;
}

/**
 * Extract amount in GHS
 */
function extractAmount(sms: string): number | null {
  // Pattern: "GHS" followed by amount
  const amountMatch = sms.match(/GHS\s*([\d.]+)/);
  if (amountMatch) {
    const amount = parseFloat(amountMatch[1]);
    return isNaN(amount) ? null : amount;
  }

  return null;
}

/**
 * Extract balance
 */
function extractBalance(sms: string): number | null {
  // Pattern 1: "Your Telecel Cash balance is GHS14.23"
  const balancePattern1 = sms.match(/[Yy]our\s+(?:Telecel\s+Cash\s+)?balance\s+is\s+GHS\s*([\d.]+)/);
  if (balancePattern1) {
    const balance = parseFloat(balancePattern1[1]);
    return isNaN(balance) ? null : balance;
  }

  // Pattern 2: "Current Balance: GHS18.12"
  const balancePattern2 = sms.match(/[Cc]urrent\s+[Bb]alance[:\s]+GHS\s*([\d.]+)/);
  if (balancePattern2) {
    const balance = parseFloat(balancePattern2[1]);
    return isNaN(balance) ? null : balance;
  }

  return null;
}

/**
 * Extract date in YYYY-MM-DD format
 */
function extractDate(sms: string): string | null {
  // Pattern 1: "on 2026-02-13 at"
  const datePattern1 = sms.match(/on\s+(\d{4}-\d{2}-\d{2})/);
  if (datePattern1) {
    return datePattern1[1];
  }

  // Pattern 2: Date in DD-MM-YYYY format
  const datePattern2 = sms.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (datePattern2) {
    // Convert DD-MM-YYYY to YYYY-MM-DD
    return `${datePattern2[3]}-${datePattern2[2]}-${datePattern2[1]}`;
  }

  return null;
}

/**
 * Extract time in HH:MM:SS format
 */
function extractTime(sms: string): string | null {
  // Pattern: "at HH:MM:SS" or "HH:MM:SS"
  const timeMatch = sms.match(/(?:at\s+)?(\d{2}):(\d{2}):(\d{2})/);
  if (timeMatch) {
    return `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`;
  }

  return null;
}

/**
 * Extract fee
 */
function extractFee(sms: string): number | null {
  // Pattern: "You were charged GHS0.00" or "Fee charged: GHS0.50"
  const feeMatch = sms.match(/(?:You\s+were\s+charged|Fee\s+charged)[:\s]+GHS\s*([\d.]+)/i);
  if (feeMatch) {
    const fee = parseFloat(feeMatch[1]);
    return isNaN(fee) ? null : fee;
  }

  return null;
}

/**
 * Extract E-levy
 */
function extractELevy(sms: string): number | null {
  // Pattern: "Your E-levy charge is GHS0.00"
  const eLevy = sms.match(/E-levy\s+charge\s+is\s+GHS\s*([\d.]+)/i);
  if (eLevy) {
    const levy = parseFloat(eLevy[1]);
    return isNaN(levy) ? null : levy;
  }

  return null;
}

/**
 * Extract sender name and number for "received" transactions
 */
function extractSenderInfo(sms: string): { name: string | null; number: string | null } {
  // Pattern: "from 233593122760-AJARATU SEIDU" or "from NAME NUMBER"
  const senderPattern = sms.match(/from\s+(\d+|[\d+]+)-?(.+?)(?:\s+on\s+|\.)/i);
  if (senderPattern) {
    const number = senderPattern[1];
    const name = senderPattern[2]?.trim() || null;
    return { name, number };
  }

  // Alternative pattern: "from NUMBER NAME"
  const senderAlt = sms.match(/from\s+([\d+]+)\s+(.+?)(?:\s+on\s+|\.)/i);
  if (senderAlt) {
    return {
      number: senderAlt[1],
      name: senderAlt[2]?.trim() || null,
    };
  }

  return { name: null, number: null };
}

/**
 * Extract receiver name and number for "sent" transactions
 */
function extractReceiverInfo(sms: string): { name: string | null; number: string | null } {
  // Pattern: "sent to 0241037421 DORCAS JATO"
  const receiverPattern = sms.match(/sent\s+to\s+([\d+]+)\s+(.+?)(?:\s+on\s+|\.)/i);
  if (receiverPattern) {
    return {
      number: receiverPattern[1],
      name: receiverPattern[2]?.trim() || null,
    };
  }

  // Alternative: "sent to PERSON NUMBER"
  const receiverAlt = sms.match(/sent\s+to\s+(.+?)\s+([\d+]+)(?:\s+on\s+|\.)/i);
  if (receiverAlt) {
    return {
      name: receiverAlt[1]?.trim() || null,
      number: receiverAlt[2],
    };
  }

  return { name: null, number: null };
}

/**
 * Extract merchant name for "cash_out" transactions
 */
function extractMerchantName(sms: string): string | null {
  // Pattern: "made for GHS35.00 to MERCHANT NAME"
  const merchantPattern = sms.match(/to\s+(.+?)\.?\s+(?:Current|Your)/i);
  if (merchantPattern) {
    return merchantPattern[1]?.trim() || null;
  }

  // Alternative: "Cash Out made for GHS35.00 to MERCHANT"
  const merchantAlt = sms.match(/Cash\s+Out\s+made\s+for\s+GHS[\d.]+\s+to\s+(.+?)(?:\.|$)/i);
  if (merchantAlt) {
    return merchantAlt[1]?.trim() || null;
  }

  return null;
}

/**
 * Validate if SMS is a valid transaction message
 */
function isValidTransaction(parsed: Omit<ParsedTransaction, 'isValidTransaction' | 'parseErrors'>): boolean {
  // Must have: type, amount, transactionDate, time, provider
  const hasRequiredFields =
    parsed.type &&
    parsed.amount &&
    parsed.transactionDate &&
    parsed.time &&
    parsed.provider;

  // Must have recipient/sender info based on type
  const hasRecipientInfo =
    parsed.type === "received"
      ? parsed.senderName || parsed.senderNumber
      : parsed.type === "sent"
      ? parsed.receiverName || parsed.receiverNumber
      : parsed.type === "cash_out"
      ? parsed.merchantName
      : true;

  return !!(hasRequiredFields && hasRecipientInfo);
}

/**
 * Main parser function
 */
export function parseTransaction(sms: string): ParsedTransaction {
  const parseErrors: string[] = [];

  // Extract all fields
  const type = detectTransactionType(sms);
  if (!type) parseErrors.push("Transaction type not detected");

  const provider = detectProvider(sms);
  if (!provider) parseErrors.push("Provider not detected");

  const transactionId = extractTransactionId(sms);
  if (!transactionId) parseErrors.push("Transaction ID not found");

  const amount = extractAmount(sms);
  if (amount === null) parseErrors.push("Amount not found");

  const transactionDate = extractDate(sms);
  if (!transactionDate) parseErrors.push("Transaction date not found");

  const time = extractTime(sms);
  if (!time) parseErrors.push("Transaction time not found");

  const balance = extractBalance(sms);
  const fee = extractFee(sms);
  const eLevy = extractELevy(sms);

  // Extract sender/receiver info based on type
  let senderName: string | null = null;
  let senderNumber: string | null = null;
  let receiverName: string | null = null;
  let receiverNumber: string | null = null;
  let merchantName: string | null = null;

  if (type === "received") {
    const sender = extractSenderInfo(sms);
    senderName = sender.name;
    senderNumber = sender.number;
  } else if (type === "sent") {
    const receiver = extractReceiverInfo(sms);
    receiverName = receiver.name;
    receiverNumber = receiver.number;
  } else if (type === "cash_out") {
    merchantName = extractMerchantName(sms);
  }

  const parsed: Omit<ParsedTransaction, 'isValidTransaction' | 'parseErrors'> = {
    transactionId,
    type,
    amount,
    senderName,
    senderNumber,
    receiverName,
    receiverNumber,
    merchantName,
    transactionDate,
    time,
    balance,
    fee,
    eLevy,
    provider,
    rawSms: sms,
  };

  return {
    ...parsed,
    isValidTransaction: isValidTransaction(parsed),
    parseErrors,
  };
}

/**
 * Quick validation check
 */
export function isValidMoMoMessage(sms: string): boolean {
  return !!detectProvider(sms) && !!detectTransactionType(sms);
}
