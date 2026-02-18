import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";
import { executeFraudDetectionAnalysis } from "../utils/momo-fraud-agent.js";
import { eq } from "drizzle-orm";

// Known MoMo provider patterns
const KNOWN_PROVIDERS = ["MTN", "VODAFONE", "AIRTELTIGO", "TELECEL"];

export interface ImportTransaction {
  senderId: string; // Provider identifier (MTN, Vodafone, etc.)
  amount: number;
  type: "credit" | "debit" | "cash_out" | "airtime" | "bill_payment";
  reference: string;
  timestamp: string; // ISO 8601
  recipient?: string;
  balance?: number;
  fee?: number;
  tax?: number;
}

/**
 * Validate transaction data structure
 */
function validateTransaction(txn: unknown): txn is ImportTransaction {
  if (!txn || typeof txn !== "object") return false;

  const t = txn as any;
  return (
    typeof t.senderId === "string" &&
    typeof t.amount === "number" &&
    t.amount > 0 &&
    typeof t.type === "string" &&
    ["credit", "debit", "cash_out", "airtime", "bill_payment"].includes(t.type) &&
    typeof t.reference === "string" &&
    typeof t.timestamp === "string"
  );
}

/**
 * Validate senderId against known MoMo providers
 */
function isKnownProvider(senderId: string): boolean {
  const upper = senderId.toUpperCase();
  return KNOWN_PROVIDERS.some(provider => upper.includes(provider));
}

/**
 * Map import type to transaction type (compatible with ParsedTransaction)
 */
function mapTransactionType(
  importType: "credit" | "debit" | "cash_out" | "airtime" | "bill_payment"
): "sent" | "received" | "cash_out" | "airtime" | "bill_payment" {
  switch (importType) {
    case "credit":
      return "received";
    case "debit":
      return "sent";
    case "cash_out":
      return "cash_out";
    case "airtime":
      return "airtime";
    case "bill_payment":
      return "bill_payment";
  }
}

/**
 * Map senderId to provider enum
 */
function mapProvider(senderId: string): "MTN" | "Vodafone" | "AirtelTigo" | "Telecel Cash" | "MTN MOBILE MONEY" {
  const upper = senderId.toUpperCase();

  if (upper.includes("MTN")) {
    return "MTN MOBILE MONEY";
  }
  if (upper.includes("VODAFONE")) {
    return "Vodafone";
  }
  if (upper.includes("AIRTELTIGO")) {
    return "AirtelTigo";
  }
  if (upper.includes("TELECEL")) {
    return "Telecel Cash";
  }

  return "MTN MOBILE MONEY"; // Default
}

export function registerTransactionsImportRoutes(
  app: App,
  fastify: FastifyInstance
) {
  /**
   * POST /api/transactions/import-batch
   * Import structured transaction data (not raw SMS)
   */
  fastify.post(
    "/api/transactions/import-batch",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        app.logger.warn({}, "Transaction import attempted without auth");
        return reply.status(401).send({
          success: false,
          error: "Unauthorized",
        });
      }

      const tokenParts = token.split(":");
      if (tokenParts.length < 1) {
        app.logger.warn({}, "Transaction import attempted with invalid token");
        return reply.status(401).send({
          success: false,
          error: "Invalid token format",
        });
      }

      const userId = tokenParts[0];
      const body = request.body as { transactions?: unknown[] };

      if (!Array.isArray(body.transactions)) {
        app.logger.warn({ userId }, "Import batch called without transactions array");
        return reply.status(400).send({
          success: false,
          error: "transactions array is required",
        });
      }

      // Rate limiting: max 100 transactions per request
      if (body.transactions.length > 100) {
        app.logger.warn(
          { userId, count: body.transactions.length },
          "Import batch exceeded rate limit"
        );
        return reply.status(429).send({
          success: false,
          error: "Maximum 100 transactions per import",
        });
      }

      if (body.transactions.length === 0) {
        return reply.status(400).send({
          success: false,
          error: "At least one transaction required",
        });
      }

      app.logger.info(
        { userId, transactionCount: body.transactions.length },
        "Transaction batch import initiated"
      );

      const importedTransactions: Array<{
        id: string;
        riskLevel: string;
        riskScore: number;
      }> = [];
      const failedTransactions: string[] = [];
      const importedAt = new Date();

      // Process each transaction
      for (let i = 0; i < body.transactions.length; i++) {
        const txnData = body.transactions[i];

        // Validate transaction structure
        if (!validateTransaction(txnData)) {
          app.logger.warn(
            { userId, txnIndex: i },
            "Invalid transaction structure"
          );
          failedTransactions.push(
            `Transaction ${i}: Invalid structure - missing required fields`
          );
          continue;
        }

        // Validate provider
        if (!isKnownProvider(txnData.senderId)) {
          app.logger.warn(
            { userId, txnIndex: i, senderId: txnData.senderId },
            "Unknown MoMo provider"
          );
          failedTransactions.push(
            `Transaction ${i}: Unknown provider - must be from MTN, Vodafone, AirtelTigo, or Telecel`
          );
          continue;
        }

        try {
          // Create pseudo-parsed transaction for fraud detection
          const pseudoParsed = {
            transactionId: txnData.reference,
            type: mapTransactionType(txnData.type),
            amount: txnData.amount,
            senderName: null,
            senderNumber: null,
            receiverName: txnData.recipient || null,
            receiverNumber: null,
            merchantName: txnData.type === "cash_out" ? txnData.recipient : null,
            billerName: txnData.type === "bill_payment" ? txnData.recipient : null,
            transactionDate: txnData.timestamp.split("T")[0],
            time: txnData.timestamp.split("T")[1]?.substring(0, 8) || null,
            balance: txnData.balance || null,
            fee: txnData.fee || null,
            eLevy: null,
            tax: txnData.tax || null,
            reference: txnData.reference,
            provider: mapProvider(txnData.senderId) as any,
            rawSms: `IMPORTED: ${txnData.senderId} - ${txnData.type} of ${txnData.amount}`,
            isValidTransaction: true,
            parseErrors: [],
          };

          // Run fraud detection
          const analysis = await executeFraudDetectionAnalysis(
            app,
            userId,
            pseudoParsed,
            pseudoParsed.rawSms
          );

          // Store in database
          const [transaction] = await app.db
            .insert(schema.transactions)
            .values({
              userId,
              rawSms: pseudoParsed.rawSms,
              provider: mapProvider(txnData.senderId),
              transactionType: mapTransactionType(txnData.type) as any,
              amount: txnData.amount.toString(),
              recipient: txnData.recipient || null,
              balance: txnData.balance?.toString() || null,
              transactionDate: new Date(txnData.timestamp),
              riskScore: analysis.riskScore,
              riskLevel: analysis.riskLevel,
              riskReasons: analysis.riskFactors,
              layer1SmsRaw: pseudoParsed.rawSms,
              layer2ValidationStatus: analysis.layerAnalysis.layer2.status,
              layer3NlpScore: analysis.layerAnalysis.layer3.totalPatternScore.toString() as any,
              layer4VelocityScore: analysis.layerAnalysis.layer4.anomalyScore.toString() as any,
              layer4AnomalyDetected: analysis.layerAnalysis.layer4.anomalyScore > 0,
              layer5RiskBreakdown: {
                layer1: analysis.layerAnalysis.layer1.senderIdScore,
                layer3: analysis.layerAnalysis.layer3.totalPatternScore,
                layer4: analysis.layerAnalysis.layer4.anomalyScore,
                layer5: analysis.layerAnalysis.layer5.velocityScore,
                layer6: analysis.layerAnalysis.layer6.totalAmountScore,
                layer7: analysis.layerAnalysis.layer7.totalTemporalScore,
              },
              layer6AlertLevel: analysis.riskLevel,
              layer7AuditTrail: {
                timestamp: new Date().toISOString(),
                riskScore: analysis.riskScore,
                riskLevel: analysis.riskLevel,
                riskFactors: analysis.riskFactors,
                source: "import_batch",
              },
              importSource: "sms_import",
              importedAt,
            })
            .returning();

          // Create alert if needed
          if (analysis.shouldAlert) {
            await app.db.insert(schema.inAppAlerts).values({
              userId,
              transactionId: transaction.id,
              alertLevel: analysis.riskLevel as any,
              title: `${analysis.riskLevel} Risk Transaction Imported`,
              message: analysis.riskFactors.join("; "),
              riskScore: analysis.riskScore,
              riskReasons: analysis.riskFactors,
              isRead: false,
            });
          }

          importedTransactions.push({
            id: transaction.id,
            riskLevel: analysis.riskLevel,
            riskScore: analysis.riskScore,
          });

          app.logger.info(
            { userId, txnIndex: i, transactionId: transaction.id },
            "Transaction imported successfully"
          );
        } catch (error) {
          app.logger.error(
            { err: error, userId, txnIndex: i },
            "Failed to import transaction"
          );
          failedTransactions.push(
            `Transaction ${i}: Database error - ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      // Update user import stats
      try {
        const currentUser = await app.db
          .select()
          .from(schema.userExtended)
          .where(eq(schema.userExtended.userId, userId))
          .limit(1);

        if (currentUser.length > 0) {
          const totalImports = (currentUser[0].totalSmsImports || 0) + 1;
          await app.db
            .update(schema.userExtended)
            .set({
              lastSmsImportAt: new Date(),
              totalSmsImports: totalImports,
            })
            .where(eq(schema.userExtended.userId, userId));
        }
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          "Failed to update user import stats"
        );
      }

      app.logger.info(
        {
          userId,
          imported: importedTransactions.length,
          failed: failedTransactions.length,
        },
        "Transaction batch import completed"
      );

      return reply.status(200).send({
        success: true,
        imported: importedTransactions.length,
        failed: failedTransactions.length,
        transactions: importedTransactions,
        errors: failedTransactions.length > 0 ? failedTransactions : undefined,
      });
    }
  );

  /**
   * GET /api/transactions/import-stats
   * Get import statistics for authenticated user
   */
  fastify.get(
    "/api/transactions/import-stats",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return reply.status(401).send({
          success: false,
          error: "Unauthorized",
        });
      }

      const tokenParts = token.split(":");
      if (tokenParts.length < 1) {
        return reply.status(401).send({
          success: false,
          error: "Invalid token format",
        });
      }

      const userId = tokenParts[0];

      app.logger.info({ userId }, "Fetching import statistics");

      try {
        // Get user stats
        const user = await app.db
          .select()
          .from(schema.userExtended)
          .where(eq(schema.userExtended.userId, userId))
          .limit(1);

        if (!user.length) {
          return reply.status(404).send({
            success: false,
            error: "User not found",
          });
        }

        // Get imported transactions
        const importedTransactions = await app.db
          .select()
          .from(schema.transactions)
          .where(eq(schema.transactions.userId, userId));

        const smsImportedCount = importedTransactions.filter(
          (t) => t.importSource === "sms_import"
        ).length;

        // Calculate average risk score for imported transactions
        const smsImported = importedTransactions.filter(
          (t) => t.importSource === "sms_import"
        );
        const avgRiskScore =
          smsImported.length > 0
            ? smsImported.reduce((sum, t) => sum + t.riskScore, 0) /
              smsImported.length
            : 0;

        return reply.status(200).send({
          success: true,
          stats: {
            totalImports: user[0].totalSmsImports || 0,
            lastImportAt: user[0].lastSmsImportAt?.toISOString() || null,
            transactionsImported: smsImportedCount,
            averageRiskScore: Math.round(avgRiskScore * 100) / 100,
            smsImportEnabled: user[0].smsImportEnabled || false,
          },
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          "Failed to fetch import statistics"
        );
        throw error;
      }
    }
  );

  /**
   * PUT /api/transactions/settings
   * Update user import settings
   */
  fastify.put(
    "/api/transactions/settings",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return reply.status(401).send({
          success: false,
          error: "Unauthorized",
        });
      }

      const tokenParts = token.split(":");
      if (tokenParts.length < 1) {
        return reply.status(401).send({
          success: false,
          error: "Invalid token format",
        });
      }

      const userId = tokenParts[0];
      const body = request.body as { smsImportEnabled?: boolean };

      app.logger.info(
        { userId, settings: body },
        "Updating transaction settings"
      );

      try {
        const [updated] = await app.db
          .update(schema.userExtended)
          .set({
            smsImportEnabled:
              body.smsImportEnabled !== undefined
                ? body.smsImportEnabled
                : undefined,
          })
          .where(eq(schema.userExtended.userId, userId))
          .returning();

        return reply.status(200).send({
          success: true,
          settings: {
            smsImportEnabled: updated.smsImportEnabled,
          },
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          "Failed to update transaction settings"
        );
        throw error;
      }
    }
  );
}
