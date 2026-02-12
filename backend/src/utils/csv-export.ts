/**
 * CSV Export utility for transactions
 */

interface TransactionRecord {
  id: string;
  provider: string;
  type: string;
  amount: number;
  recipient?: string;
  balance?: number;
  date: Date;
  riskScore: number;
  riskLevel: string;
  riskReasons?: string[];
  isBlocked: boolean;
  isFraudReported: boolean;
}

/**
 * Convert transactions to CSV format
 */
export function transactionsToCSV(transactions: TransactionRecord[]): string {
  const headers = [
    "ID",
    "Provider",
    "Type",
    "Amount (GHS)",
    "Recipient",
    "Balance (GHS)",
    "Date",
    "Risk Score",
    "Risk Level",
    "Risk Reasons",
    "Blocked",
    "Fraud Reported",
  ];

  const rows = transactions.map((t) => [
    t.id,
    t.provider,
    t.type,
    t.amount.toFixed(2),
    t.recipient || "",
    t.balance ? t.balance.toFixed(2) : "",
    t.date.toISOString(),
    t.riskScore,
    t.riskLevel,
    t.riskReasons ? t.riskReasons.join("; ") : "",
    t.isBlocked ? "Yes" : "No",
    t.isFraudReported ? "Yes" : "No",
  ]);

  // Escape CSV values that contain commas or quotes
  const escapedRows = rows.map((row) =>
    row
      .map((cell) => {
        const cellStr = String(cell);
        if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      })
      .join(",")
  );

  return [headers.join(","), ...escapedRows].join("\n");
}
