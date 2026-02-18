import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";
import { parseTransaction } from "../utils/telecel-sms-parser.js";
import {
  executeFraudAnalysis,
  type FraudAnalysisResult,
} from "../utils/fraud-detection-7-layer.js";
import { eq } from "drizzle-orm";

export function registerFraudAnalysisRoutes(
  app: App,
  fastify: FastifyInstance
) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/chatbot/analyze-sms
   * Analyze SMS message and return fraud analysis with chatbot reply
   */
  fastify.post(
    "/api/chatbot/analyze-sms",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const body = request.body as {
        smsMessage: string;
      };

      if (!body.smsMessage || typeof body.smsMessage !== "string") {
        app.logger.warn({ userId }, "SMS analysis called without SMS message");
        return reply.status(400).send({
          success: false,
          error: "smsMessage is required and must be a string",
        });
      }

      app.logger.info(
        { userId, smsLength: body.smsMessage.length },
        "SMS fraud analysis requested"
      );

      try {
        // Parse SMS
        const parsed = parseTransaction(body.smsMessage);

        // Validate it's a real MoMo transaction
        if (!parsed.isValidTransaction) {
          app.logger.info(
            { userId, errors: parsed.parseErrors },
            "SMS is not a valid MoMo transaction"
          );

          return reply.status(400).send({
            success: false,
            error:
              "This doesn't appear to be a valid MoMo transaction SMS",
            details: {
              parseErrors: parsed.parseErrors,
              rawSms: "[REDACTED]",
            },
          });
        }

        // Execute 7-layer fraud analysis
        const analysis = await executeFraudAnalysis(app, userId, parsed);

        // Generate chatbot reply
        const chatbotReply = generateChatbotReply(parsed, analysis);

        // Create transaction record
        const transactionTypeValue: "sent" | "received" | "cash_out" | "withdrawal" | "deposit" | "airtime" | "bill_payment" =
          (parsed.type as any) || "received";

        const providerValue: "MTN" | "Vodafone" | "AirtelTigo" | "Telecel Cash" | "MTN MOBILE MONEY" =
          (parsed.provider as any) || "MTN";

        const [transaction] = await app.db
          .insert(schema.transactions)
          .values({
            userId,
            rawSms: "[REDACTED]",
            provider: providerValue,
            transactionType: transactionTypeValue,
            amount: (parsed.amount || 0).toString(),
            recipient:
              parsed.type === "sent"
                ? parsed.receiverName || parsed.receiverNumber
                : parsed.type === "received"
                ? parsed.senderName || parsed.senderNumber
                : parsed.merchantName,
            balance: parsed.balance?.toString(),
            transactionDate: new Date(
              `${parsed.transactionDate}T${parsed.time || "00:00:00"}Z`
            ),
            riskScore: analysis.layer5.riskScore,
            riskLevel: (analysis.layer5.riskLevel as any) || "LOW",
            riskReasons: analysis.layer5.factors,
            layer1SmsRaw: "[REDACTED]",
            layer2ValidationStatus: analysis.layer2.status,
            layer3NlpScore: analysis.layer3.nlpScore.toString() as any,
            layer3ScamKeywords: analysis.layer3.scamKeywords,
            layer4VelocityScore: analysis.layer4.velocityScore.toString() as any,
            layer4AnomalyDetected: analysis.layer4.isAnomaly,
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
            message: analysis.layer6.message,
            riskScore: analysis.layer5.riskScore,
            riskReasons: analysis.layer5.factors,
            isRead: false,
          });

          app.logger.warn(
            {
              userId,
              transactionId: transaction.id,
              riskLevel: analysis.layer5.riskLevel,
            },
            "Alert created for MoMo transaction"
          );
        }

        app.logger.info(
          {
            userId,
            transactionId: transaction.id,
            riskLevel: analysis.layer5.riskLevel,
            amount: parsed.amount,
          },
          "SMS fraud analysis completed successfully"
        );

        return reply.status(200).send({
          success: true,
          reply: chatbotReply,
          riskLevel: analysis.layer5.riskLevel,
          riskScore: analysis.layer5.riskScore,
          shouldAlert: analysis.layer6.shouldAlert,
          transactionAnalysis: {
            transactionId: transaction.id,
            parsed: {
              provider: parsed.provider,
              type: parsed.type,
              amount: parsed.amount,
              recipient:
                parsed.type === "sent"
                  ? parsed.receiverName || parsed.receiverNumber
                  : parsed.type === "received"
                  ? parsed.senderName || parsed.senderNumber
                  : parsed.merchantName,
              transactionDate: parsed.transactionDate,
              time: parsed.time,
              balance: parsed.balance,
            },
            riskAnalysis: {
              layer1: {
                status: analysis.layer1.status,
                provider: analysis.layer1.provider,
              },
              layer3: {
                nlpScore: analysis.layer3.nlpScore,
                scamKeywords: analysis.layer3.scamKeywords,
              },
              layer5: {
                riskScore: analysis.layer5.riskScore,
                riskLevel: analysis.layer5.riskLevel,
                breakdown: analysis.layer5.breakdown,
              },
            },
          },
          processingTimeMs: analysis.processingTimeMs,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId, smsLength: body.smsMessage?.length },
          "SMS fraud analysis failed"
        );
        throw error;
      }
    }
  );
}

/**
 * Generate chatbot reply with exact format
 */
function generateChatbotReply(
  parsed: ReturnType<typeof parseTransaction>,
  analysis: FraudAnalysisResult
): string {
  const amount = (parsed.amount || 0).toFixed(2);
  const recipient =
    parsed.type === "sent"
      ? parsed.receiverName || parsed.receiverNumber || "Unknown"
      : parsed.type === "received"
      ? parsed.senderName || parsed.senderNumber || "Unknown"
      : parsed.merchantName || "Unknown";

  const timestamp = `${parsed.transactionDate} at ${parsed.time}`;
  const score = analysis.layer5.riskScore;

  let reason = "";
  if (analysis.layer5.riskLevel === "CRITICAL") {
    reason =
      "Multiple high-risk indicators detected. DO NOT PROCEED with this transaction.";
  } else if (analysis.layer5.riskLevel === "HIGH") {
    reason =
      "Suspicious activity detected. Review carefully before proceeding.";
  } else if (analysis.layer5.riskLevel === "MEDIUM") {
    reason = "Some unusual patterns detected. Proceed with caution.";
  } else {
    reason = "Transaction appears legitimate. Safe to proceed.";
  }

  const emoji =
    analysis.layer5.riskLevel === "LOW"
      ? "✅"
      : analysis.layer5.riskLevel === "MEDIUM"
      ? "⚠️"
      : "⚠️";

  return `Amount: GHS ${amount}
Recipient: ${recipient}
Time: ${timestamp}
Risk Score: ${score}/100
${emoji} ${reason}`;
}
