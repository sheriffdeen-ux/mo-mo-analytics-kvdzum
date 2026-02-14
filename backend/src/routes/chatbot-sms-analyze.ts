import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";
import { parseMoMoSms, isMoMoTransaction } from "../utils/momo-sms-parser.js";
import {
  executeSecurityAnalysis,
} from "../utils/security-7-layers.js";
import { eq } from "drizzle-orm";

/**
 * Generate templated chatbot reply based on risk score
 * Uses the exact template specified in the requirements
 */
function generateTemplatedReply(
  amount: number,
  recipient: string | null,
  time: string | null,
  riskScore: number,
  riskLevel: string,
  parseErrors: string[]
): string {
  // Build the risk reason based on score and level
  let reason = "";

  if (riskLevel === "CRITICAL") {
    reason = "Multiple high-risk indicators detected. DO NOT PROCEED.";
  } else if (riskLevel === "HIGH") {
    reason = "Suspicious activity detected. Review carefully before proceeding.";
  } else if (riskLevel === "MEDIUM") {
    reason = "Some unusual patterns detected. Proceed with caution.";
  } else {
    reason = "Transaction appears legitimate.";
  }

  return `Amount: GHS ${amount.toFixed(2)}
Recipient: ${recipient || "Unknown"}
Time: ${time || "Unknown"}
Risk Score: ${riskScore}/100
${riskLevel === "CRITICAL" || riskLevel === "HIGH" ? "⚠️" : "✅"} ${reason}`;
}

export function registerChatbotSmsAnalyzeRoutes(
  app: App,
  fastify: FastifyInstance
) {
  // POST /api/chatbot/sms/analyze
  fastify.post(
    "/api/chatbot/sms/analyze",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        app.logger.warn({}, "SMS chatbot analysis attempted without auth");
        return reply.status(401).send({
          success: false,
          error: "Unauthorized",
        });
      }

      const tokenParts = token.split(":");
      if (tokenParts.length < 1) {
        app.logger.warn({}, "SMS chatbot analysis attempted with invalid token");
        return reply.status(401).send({
          success: false,
          error: "Invalid token format",
        });
      }

      const userId = tokenParts[0];

      const body = request.body as {
        smsMessage: string;
      };

      if (!body.smsMessage || typeof body.smsMessage !== "string") {
        app.logger.warn({ userId }, "SMS chatbot analysis called without SMS message");
        return reply.status(400).send({
          success: false,
          error: "smsMessage is required and must be a string",
        });
      }

      app.logger.info(
        { userId, smsLength: body.smsMessage.length },
        "MoMo SMS chatbot analysis requested"
      );

      try {
        // Parse the SMS using MoMo parser
        const parsed = parseMoMoSms(body.smsMessage);

        // Check if it's a valid MoMo transaction
        if (!parsed.isValidTransaction) {
          app.logger.info(
            { userId, errors: parsed.parseErrors },
            "SMS is not a valid MoMo transaction"
          );

          return reply.status(400).send({
            success: false,
            error: "This doesn't appear to be a MoMo transaction SMS",
            details: {
              parseErrors: parsed.parseErrors,
              rawSms: body.smsMessage,
            },
          });
        }

        // Execute 7-layer security analysis
        const analysis = await executeSecurityAnalysis(
          app,
          userId,
          `sms_${Date.now()}`,
          body.smsMessage,
          app.logger
        );

        // Generate templated reply
        const chatbotReply = generateTemplatedReply(
          parsed.amount || 0,
          parsed.recipient,
          parsed.time,
          analysis.layer5.riskScore,
          analysis.layer5.riskLevel,
          parsed.parseErrors
        );

        // Create transaction record for audit trail
        const transactionTypeValue: "sent" | "received" | "withdrawal" | "deposit" | "airtime" | "bill_payment" =
          (parsed.transactionType as any) || "received";

        const [transaction] = await app.db
          .insert(schema.transactions)
          .values({
            userId,
            rawSms: body.smsMessage,
            provider: (parsed.provider || "MTN") as any,
            transactionType: transactionTypeValue,
            amount: (parsed.amount || 0).toString(),
            recipient: parsed.recipient,
            balance: parsed.balance?.toString(),
            transactionDate: new Date(parsed.time || new Date()),
            riskScore: analysis.layer5.riskScore,
            riskLevel: analysis.layer5.riskLevel as any,
            riskReasons: Object.keys(analysis.layer5.breakdown).filter(
              (key) =>
                analysis.layer5.breakdown[
                  key as keyof typeof analysis.layer5.breakdown
                ] > 0
            ),
            // Store 7-layer data
            layer1SmsRaw: body.smsMessage,
            layer2ValidationStatus: analysis.layer2.status,
            layer3NlpScore: analysis.layer3.nlpScore.toString(),
            layer3ScamKeywords: analysis.layer3.scamKeywords,
            layer4VelocityScore: analysis.layer4.velocityScore.toString(),
            layer4AnomalyDetected: analysis.layer4.anomalyDetected,
            layer5RiskBreakdown: analysis.layer5.breakdown,
            layer6AlertLevel: analysis.layer6.alertLevel,
            layer7AuditTrail: analysis.layer7.auditTrail,
          })
          .returning();

        // Create alert if needed
        if (analysis.layer6.shouldAlert) {
          await app.db.insert(schema.inAppAlerts).values({
            userId,
            transactionId: transaction.id,
            alertLevel: analysis.layer6.alertLevel as any,
            title: `${analysis.layer6.alertLevel} Risk Transaction Detected`,
            message: `A ${analysis.layer6.alertLevel.toLowerCase()}-risk transaction of GHS ${parsed.amount || 0} to ${parsed.recipient || "unknown"} was detected.`,
            riskScore: analysis.layer5.riskScore,
            riskReasons: Object.keys(analysis.layer5.breakdown).filter(
              (key) =>
                analysis.layer5.breakdown[
                  key as keyof typeof analysis.layer5.breakdown
                ] > 0
            ),
          });

          app.logger.warn(
            {
              userId,
              transactionId: transaction.id,
              riskLevel: analysis.layer5.riskLevel,
            },
            "Alert created for MoMo SMS transaction"
          );
        }

        app.logger.info(
          {
            userId,
            transactionId: transaction.id,
            riskLevel: analysis.layer5.riskLevel,
            amount: parsed.amount,
            recipient: parsed.recipient,
          },
          "MoMo SMS chatbot analysis completed successfully"
        );

        return reply.status(200).send({
          success: true,
          chatbotReply,
          transaction: {
            id: transaction.id,
            provider: parsed.provider,
            transactionType: parsed.transactionType,
            amount: parsed.amount,
            recipient: parsed.recipient,
            referenceNumber: parsed.referenceNumber,
            balance: parsed.balance,
            time: parsed.time,
            date: parsed.date,
          },
          analysis: {
            riskScore: analysis.layer5.riskScore,
            riskLevel: analysis.layer5.riskLevel,
            shouldAlert: analysis.layer6.shouldAlert,
            alertLevel: analysis.layer6.alertLevel,
            processingTimeMs: analysis.totalProcessingTimeMs,
            breakdown: {
              layer1: {
                status: analysis.layer1.status,
                provider: analysis.layer1.provider,
                type: analysis.layer1.type,
              },
              layer3: {
                nlpScore: analysis.layer3.nlpScore,
                scamKeywords: analysis.layer3.scamKeywords,
                sentiment: analysis.layer3.sentiment,
              },
              layer4: {
                velocityScore: analysis.layer4.velocityScore,
                anomalyDetected: analysis.layer4.anomalyDetected,
              },
              layer5: {
                riskScore: analysis.layer5.riskScore,
                riskLevel: analysis.layer5.riskLevel,
                breakdown: analysis.layer5.breakdown,
              },
            },
          },
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId, smsLength: body.smsMessage?.length },
          "MoMo SMS chatbot analysis failed"
        );
        throw error;
      }
    }
  );

  // GET /api/chatbot/sms/transaction-history
  // Retrieve user's analyzed transactions
  fastify.get(
    "/api/chatbot/sms/transaction-history",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        app.logger.warn({}, "Transaction history requested without auth");
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
      const page = Math.max(1, parseInt((request.query as any).page) || 1);
      const limit = Math.min(100, parseInt((request.query as any).limit) || 20);
      const offset = (page - 1) * limit;
      const riskLevel = (request.query as any).riskLevel;
      const provider = (request.query as any).provider;

      app.logger.info(
        { userId, page, limit, riskLevel, provider },
        "Transaction history requested"
      );

      try {
        const conditions: any[] = [eq(schema.transactions.userId, userId)];

        if (
          riskLevel &&
          ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(riskLevel)
        ) {
          conditions.push(eq(schema.transactions.riskLevel, riskLevel as any));
        }

        if (provider && ["MTN", "Vodafone", "AirtelTigo"].includes(provider)) {
          conditions.push(eq(schema.transactions.provider, provider as any));
        }

        // Get total count
        const countResult = await app.db
          .select({ count: schema.transactions.id })
          .from(schema.transactions)
          .where(conditions.length > 0 ? conditions[0] : undefined)
          .limit(1);

        const total = countResult.length;

        // Get transactions
        let query = app.db
          .select()
          .from(schema.transactions)
          .where(conditions.length > 0 ? conditions[0] : undefined)
          .orderBy(schema.transactions.createdAt);

        const transactions = await query.limit(limit).offset(offset);

        app.logger.info(
          { userId, total, returned: transactions.length },
          "Transaction history retrieved"
        );

        return reply.status(200).send({
          success: true,
          data: transactions,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          "Failed to retrieve transaction history"
        );
        throw error;
      }
    }
  );

  // GET /api/chatbot/sms/transaction/:transactionId
  // Retrieve details of a specific transaction
  fastify.get(
    "/api/chatbot/sms/transaction/:transactionId",
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
      const transactionId = (request.params as any).transactionId;

      app.logger.info(
        { userId, transactionId },
        "Transaction details requested"
      );

      try {
        const [transaction] = await app.db
          .select()
          .from(schema.transactions)
          .where(
            eq(
              schema.transactions.id,
              transactionId as any
            )
          )
          .limit(1);

        if (!transaction) {
          app.logger.warn(
            { userId, transactionId },
            "Transaction not found"
          );
          return reply.status(404).send({
            success: false,
            error: "Transaction not found",
          });
        }

        if (transaction.userId !== userId) {
          app.logger.warn(
            { userId, transactionId, ownerId: transaction.userId },
            "Unauthorized access to transaction"
          );
          return reply.status(403).send({
            success: false,
            error: "You do not have access to this transaction",
          });
        }

        app.logger.info(
          { userId, transactionId },
          "Transaction details retrieved successfully"
        );

        return reply.status(200).send({
          success: true,
          data: transaction,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId, transactionId },
          "Failed to retrieve transaction details"
        );
        throw error;
      }
    }
  );
}
