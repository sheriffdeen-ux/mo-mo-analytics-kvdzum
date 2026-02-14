import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";
import {
  executeSecurityAnalysis,
  layer1_smsCaptureAndParsing,
} from "../utils/security-7-layers.js";

export function registerSmsWebhookRoutes(
  app: App,
  fastify: FastifyInstance
) {
  // POST /api/sms/webhook - Receive forwarded SMS from external sources
  fastify.post(
    "/api/sms/webhook",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as {
        smsMessage: string;
        userId?: string;
        phoneNumber?: string;
        provider?: string;
      };

      if (!body.smsMessage) {
        return reply.status(400).send({
          success: false,
          error: "smsMessage is required",
        });
      }

      app.logger.info(
        { messageLength: body.smsMessage.length },
        "SMS webhook received"
      );

      try {
        // Parse SMS to get provider and basic info
        const parsed = layer1_smsCaptureAndParsing(body.smsMessage);

        // Use provided userId or default to webhook user
        const userId = body.userId || "webhook_user";

        // Generate transaction log ID for audit purposes
        const txnLogId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Execute 7-layer security analysis
        const analysis = await executeSecurityAnalysis(
          app,
          userId,
          txnLogId,
          body.smsMessage,
          app.logger
        );

        // Create transaction record
        const [transaction] = await app.db
          .insert(schema.transactions)
          .values({
            userId,
            rawSms: body.smsMessage,
            provider: parsed.provider || "MTN",
            transactionType: (parsed.type as any) || "received",
            amount: (parsed.amount || 0).toString(),
            recipient: parsed.recipient,
            balance: (parsed.balance?.toString()),
            transactionDate: parsed.timestamp,
            riskScore: analysis.layer5.riskScore,
            riskLevel: analysis.layer5.riskLevel,
            riskReasons: analysis.layer5.riskLevel !== "LOW" ? [analysis.layer4.anomalyReason || "Fraud detected"].filter(Boolean) : [],
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

        // Create alert if needed (use actual transaction UUID)
        if (analysis.layer6.shouldAlert) {
          await app.db.insert(schema.alerts).values({
            transactionId: transaction.id,
            level: analysis.layer6.alertLevel as any,
            status: "pending",
          });

          // Create in-app alert
          await app.db.insert(schema.inAppAlerts).values({
            userId,
            transactionId: transaction.id,
            alertLevel: analysis.layer6.alertLevel as any,
            title: `${analysis.layer6.alertLevel} Risk Transaction Detected`,
            message: `A ${analysis.layer6.alertLevel.toLowerCase()}-risk transaction of GHS ${parsed.amount || 0} was detected. Amount: ${analysis.layer5.riskLevel}`,
            riskScore: analysis.layer5.riskScore,
            riskReasons: analysis.layer5.riskLevel !== "LOW" ? [analysis.layer4.anomalyReason || "Security check required"].filter(Boolean) : [],
          });

          app.logger.warn(
            {
              userId,
              transactionId: transaction.id,
              riskLevel: analysis.layer5.riskLevel,
            },
            "Alert created for transaction"
          );
        }

        app.logger.info(
          {
            userId,
            transactionId: transaction.id,
            riskScore: analysis.layer5.riskScore,
            processingTimeMs: analysis.totalProcessingTimeMs,
          },
          "SMS webhook processed successfully"
        );

        return {
          success: true,
          transactionId: transaction.id,
          analysis: {
            layer1: {
              status: analysis.layer1.status,
              provider: analysis.layer1.provider,
              type: analysis.layer1.type,
              amount: analysis.layer1.amount,
            },
            layer2: { status: analysis.layer2.status },
            layer3: {
              status: analysis.layer3.status,
              nlpScore: analysis.layer3.nlpScore,
              scamKeywords: analysis.layer3.scamKeywords,
            },
            layer4: {
              status: analysis.layer4.status,
              velocityScore: analysis.layer4.velocityScore,
              anomalyDetected: analysis.layer4.anomalyDetected,
            },
            layer5: {
              status: analysis.layer5.status,
              riskScore: analysis.layer5.riskScore,
              riskLevel: analysis.layer5.riskLevel,
            },
            layer6: {
              status: analysis.layer6.status,
              alertLevel: analysis.layer6.alertLevel,
              shouldAlert: analysis.layer6.shouldAlert,
            },
            layer7: { status: analysis.layer7.status },
          },
          transaction: {
            id: transaction.id,
            amount: transaction.amount,
            riskLevel: transaction.riskLevel,
            riskScore: transaction.riskScore,
          },
          processingTimeMs: analysis.totalProcessingTimeMs,
        };
      } catch (error) {
        app.logger.error(
          { err: error, smsLength: body.smsMessage.length },
          "SMS webhook processing failed"
        );
        throw error;
      }
    }
  );
}
