/**
 * Enhanced SMS Parser for All Ghana MoMo Providers
 * Handles multiple SMS formats: received, sent, cash_out, airtime, bill_payment,
 * balance_inquiry, failed transactions, promotional messages, and other MoMo messages
 */

export interface ParsedTransaction {
  transactionId: string | null;
  type: "received" | "sent" | "cash_out" | "airtime" | "bill_payment" | "balance_inquiry" | "failed" | "promotional" | "other" | null;
  amount: number | null;
  senderName: string | null;
  senderNumber: string | null;
  receiverName: string | null;
  receiverNumber: string | null;
  merchantName: string | null;
  billerName: string | null;
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
function detectTransactionType(sms: string): "received" | "sent" | "cash_out" | "airtime" | "bill_payment" | "balance_inquiry" | "failed" | "promotional" | "other" | null {
  const smsUpper = sms.toUpperCase();

  // Check for failed transactions (must be before checking other patterns)
  if (smsUpper.includes("FAILED") || smsUpper.includes("UNSUCCESSFUL") || smsUpper.includes("DECLINED")) {
    return "failed";
  }

  // Check for balance inquiry
  if (smsUpper.includes("YOUR BALANCE") || smsUpper.includes("CURRENT BALANCE")) {
    return "balance_inquiry";
  }

  // Check for airtime purchases
  if (smsUpper.includes("AIRTIME") || smsUpper.includes("PURCHASED AIRTIME")) {
    return "airtime";
  }

  // Check for bill payments
  if (smsUpper.includes("BILL PAYMENT") || smsUpper.includes("PAID TO ECG") || smsUpper.includes("PAID TO GHANA WATER") || smsUpper.includes("PAID TO")) {
    return "bill_payment";
  }

  // Check for promotional messages
  if (smsUpper.includes("BONUS") || smsUpper.includes("OFFER") || smsUpper.includes("PROMOTION") || smsUpper.includes("2X BONUS")) {
    return "promotional";
  }

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

  // If we have a provider but no specific type, mark as "other"
  // This allows us to handle unrecognized but MoMo-related messages gracefully
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
  // Pattern 1: "from 233593122760-AJARATU SEIDU" (number-name format)
  const senderPattern1 = sms.match(/from\s+(\d+)\s*-\s*(.+?)(?:\s+on\s+|with|$)/i);
  if (senderPattern1) {
    const number = senderPattern1[1];
    const name = senderPattern1[2]?.trim() || null;
    return { name, number };
  }

  // Pattern 2: "Transfer From: 233593122760-AJARATU SEIDU"
  const senderPattern2 = sms.match(/Transfer\s+From:\s+(\d+)\s*-?\s*(.+?)(?:\s+on\s+|with|$)/i);
  if (senderPattern2) {
    const number = senderPattern2[1];
    const name = senderPattern2[2]?.trim() || null;
    return { name, number };
  }

  // Pattern 3: "from NUMBER NAME"
  const senderPattern3 = sms.match(/from\s+([\d+]+)\s+(.+?)(?:\s+on\s+|\.)/i);
  if (senderPattern3) {
    return {
      number: senderPattern3[1],
      name: senderPattern3[2]?.trim() || null,
    };
  }

  return { name: null, number: null };
}

/**
 * Extract receiver name and number for "sent" transactions
 */
function extractReceiverInfo(sms: string): { name: string | null; number: string | null } {
  // Pattern 1: "sent to 0241037421 DORCAS JATO"
  const receiverPattern1 = sms.match(/sent\s+to\s+([\d+]+)\s+(.+?)(?:\s+on\s+|with|$)/i);
  if (receiverPattern1) {
    return {
      number: receiverPattern1[1],
      name: receiverPattern1[2]?.trim() || null,
    };
  }

  // Pattern 2: "sent to PERSON NUMBER"
  const receiverPattern2 = sms.match(/sent\s+to\s+([A-Za-z\s]+)\s+([\d+]+)(?:\s+on\s+|$)/i);
  if (receiverPattern2) {
    return {
      name: receiverPattern2[1]?.trim() || null,
      number: receiverPattern2[2],
    };
  }

  // Pattern 3: Just extract the name after "sent to" if number not found
  const receiverPattern3 = sms.match(/sent\s+to\s+(.+?)(?:\s+on\s+|with\s+|$)/i);
  if (receiverPattern3) {
    const content = receiverPattern3[1]?.trim();
    // Check if it contains a number
    const numberMatch = content?.match(/([\d+]+)/);
    if (numberMatch) {
      const name = content?.replace(numberMatch[1], "").trim() || null;
      return {
        name: name || null,
        number: numberMatch[1],
      };
    }
    return { name: content || null, number: null };
  }

  return { name: null, number: null };
}

/**
 * Extract merchant name for "cash_out" transactions
 */
function extractMerchantName(sms: string): string | null {
  // Pattern 1: "made for GHS35.00 to MERCHANT NAME. Current Balance:"
  const merchantPattern1 = sms.match(/made\s+for\s+GHS[\d.]+\s+to\s+(.+?)\.?\s+(?:Current|Your|Financial)/i);
  if (merchantPattern1) {
    return merchantPattern1[1]?.trim() || null;
  }

  // Pattern 2: "Cash Out made for GHS35.00 to MERCHANT"
  const merchantPattern2 = sms.match(/[Cc]ash\s+[Oo]ut\s+made\s+for\s+GHS[\d.]+\s+to\s+(.+?)(?:\.|$)/i);
  if (merchantPattern2) {
    return merchantPattern2[1]?.trim() || null;
  }

  // Pattern 3: "to MERCHANT NAME. Current Balance:" or similar
  const merchantPattern3 = sms.match(/to\s+(.+?)\.?\s+(?:Current|Your)\s+/i);
  if (merchantPattern3) {
    return merchantPattern3[1]?.trim() || null;
  }

  return null;
}

/**
 * Extract biller name for "bill_payment" transactions
 */
function extractBillerName(sms: string): string | null {
  // Pattern 1: "paid to ECG" or "paid to Ghana Water"
  const billerPattern1 = sms.match(/paid\s+to\s+(.+?)(?:\.|,|\s+on\s+|$)/i);
  if (billerPattern1) {
    return billerPattern1[1]?.trim() || null;
  }

  // Pattern 2: "Bill payment of GHS50.00 to BILLER"
  const billerPattern2 = sms.match(/[Bb]ill\s+[Pp]ayment\s+of\s+GHS[\d.]+\s+to\s+(.+?)(?:\.|,|$)/i);
  if (billerPattern2) {
    return billerPattern2[1]?.trim() || null;
  }

  return null;
}

/**
 * Validate if SMS is a valid MoMo transaction message
 * CRITICAL: Must handle ALL MoMo messages without returning errors
 * Default to LOW RISK for all legitimate messages from known providers
 */
function isValidTransaction(parsed: Omit<ParsedTransaction, 'isValidTransaction' | 'parseErrors'>): boolean {
  // Must have a known MoMo provider
  if (!parsed.provider) {
    return false;
  }

  // Balance inquiries, failed transactions, and promotional messages are always valid
  // (they don't require amount or transaction type)
  if (parsed.type === "balance_inquiry" || parsed.type === "failed" || parsed.type === "promotional") {
    return true;
  }

  // For "other" type (unrecognized MoMo messages), accept if we have provider
  if (parsed.type === "other") {
    return true;
  }

  // For actual transactions (received, sent, cash_out, airtime, bill_payment)
  // Must have: type and provider (more lenient on amount/date/time)
  if (!parsed.type) {
    return false;
  }

  // Type-specific validation
  const hasRequiredInfo =
    parsed.type === "received"
      ? parsed.senderName || parsed.senderNumber || parsed.amount
      : parsed.type === "sent"
      ? parsed.receiverName || parsed.receiverNumber || parsed.amount
      : parsed.type === "cash_out"
      ? parsed.merchantName || parsed.amount
      : parsed.type === "airtime"
      ? parsed.amount
      : parsed.type === "bill_payment"
      ? parsed.billerName || parsed.amount
      : true;

  return !!hasRequiredInfo;
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
  let billerName: string | null = null;

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
  } else if (type === "bill_payment") {
    billerName = extractBillerName(sms);
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
    billerName,
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
 * Quick validation check - returns true if SMS is from a known MoMo provider
 * This is more lenient to allow any MoMo message to be processed
 */
export function isValidMoMoMessage(sms: string): boolean {
  return !!detectProvider(sms);
}
