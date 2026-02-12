/**
 * SMS Parser for MoMo transactions
 * Supports MTN MoMo, Vodafone Cash, and AirtelTigo Money
 */

export interface ParsedTransaction {
  provider: "MTN" | "Vodafone" | "AirtelTigo";
  transactionType: "sent" | "received" | "withdrawal" | "deposit";
  amount: number;
  recipient?: string;
  balance?: number;
  transactionDate: Date;
}

/**
 * Parse MoMo SMS message to extract transaction details
 */
export function parseMoMoSMS(smsText: string): ParsedTransaction {
  const upperText = smsText.toUpperCase();

  // Detect provider
  let provider: "MTN" | "Vodafone" | "AirtelTigo";
  if (upperText.includes("MTN")) {
    provider = "MTN";
  } else if (upperText.includes("VODAFONE") || upperText.includes("VOD")) {
    provider = "Vodafone";
  } else if (
    upperText.includes("AIRTEL") ||
    upperText.includes("TIGO") ||
    upperText.includes("AIRTELTIGO")
  ) {
    provider = "AirtelTigo";
  } else {
    throw new Error("Unable to detect MoMo provider from SMS");
  }

  // Extract amount (look for GHS, GH₵, or ₵)
  const amountRegex = /(?:GHS|GH₵|₵)\s*([\d,]+(?:\.\d{2})?)/i;
  const amountMatch = smsText.match(amountRegex);
  if (!amountMatch) {
    throw new Error("Unable to extract amount from SMS");
  }
  const amount = parseFloat(amountMatch[1].replace(/,/g, ""));

  // Determine transaction type
  let transactionType: "sent" | "received" | "withdrawal" | "deposit";
  if (
    upperText.includes("SENT") ||
    upperText.includes("TRANSFER") ||
    upperText.includes("PAID")
  ) {
    transactionType = "sent";
  } else if (
    upperText.includes("RECEIVED") ||
    upperText.includes("CREDIT") ||
    upperText.includes("SENT TO YOU")
  ) {
    transactionType = "received";
  } else if (upperText.includes("WITHDRAW")) {
    transactionType = "withdrawal";
  } else if (upperText.includes("DEPOSIT") || upperText.includes("AIRTIME")) {
    transactionType = "deposit";
  } else {
    // Default based on context clues
    transactionType = "sent";
  }

  // Extract recipient/merchant name
  // Look for patterns like "to John", "from Jane", "merchant:", etc.
  let recipient: string | undefined;
  const recipientPatterns = [
    /(?:to|sent to)\s+([A-Za-z\s]+?)(?:\s+(?:on|at|GHS|amount|new balance))/i,
    /(?:from)\s+([A-Za-z\s]+?)(?:\s+(?:on|at|GHS|amount))/i,
    /(?:merchant|seller):\s*([A-Za-z0-9\s\-\.]+?)(?:\s+(?:GHS|amount|new balance))/i,
  ];

  for (const pattern of recipientPatterns) {
    const match = smsText.match(pattern);
    if (match) {
      recipient = match[1].trim();
      break;
    }
  }

  // Extract balance (new balance after transaction)
  const balanceRegex = /(?:new\s+)?balance:?\s*(?:GHS|GH₵|₵)\s*([\d,]+(?:\.\d{2})?)/i;
  const balanceMatch = smsText.match(balanceRegex);
  let balance: number | undefined;
  if (balanceMatch) {
    balance = parseFloat(balanceMatch[1].replace(/,/g, ""));
  }

  // Extract transaction date/time
  // Try to parse date from SMS or use current time
  let transactionDate = new Date();

  // Look for time patterns like "2:45pm", "14:30", etc.
  const timeRegex = /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i;
  const timeMatch = smsText.match(timeRegex);

  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const isPM = timeMatch[4]?.toLowerCase() === "pm";

    const adjustedHours = isPM && hours !== 12 ? hours + 12 : hours;

    transactionDate = new Date();
    transactionDate.setHours(adjustedHours, minutes, 0, 0);
  }

  return {
    provider,
    transactionType,
    amount,
    recipient,
    balance,
    transactionDate,
  };
}

/**
 * Example SMS messages for different providers:
 *
 * MTN MoMo:
 * "MTN MoMo: You sent GHS 100.00 to 0551234567 on 12/Jan/2024 at 2:45pm. New Balance: GHS 1,450.50"
 *
 * Vodafone Cash:
 * "VOD: Cash out GHS 50.00 successful. New Balance: GHS 2,340.00. Ref: ABC123"
 *
 * AirtelTigo Money:
 * "AirtelTigo: You received GHS 200.00 from John Doe. New Balance: GHS 2,650.00"
 */
