import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";
import {
  executeSecurityAnalysis,
  layer1_smsCaptureAndParsing,
} from "../utils/security-7-layers.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI | null {
  if (!GEMINI_API_KEY) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return geminiClient;
}

/**
 * Generate chatbot reply based on fraud analysis
 */
async function generateChatbotReply(
  riskLevel: string,
  amount: number,
  recipient: string | null,
  reference: string | null,
  timestamp: Date,
  riskReasons: string[],
  logger?: any
): Promise<string> {
  try {
    const gemini = getGeminiClient();

    if (!gemini) {
      logger?.warn("Gemini API key not configured");
      return generateFallbackReply(riskLevel, amount, recipient, reference);
    }

    const model = gemini.getGenerativeModel({ model: "gemini-pro" });

    let prompt = "";

    if (riskLevel === "CRITICAL" || riskLevel === "HIGH") {
      prompt = `Generate a cautionary SMS reply for a fraudulent transaction of GHS ${amount} to ${recipient || "unknown"}. Reference: ${reference}. Risk: ${riskLevel}. Keep it concise and warn the user not to proceed. Include the reference number. Max 160 characters.`;
    } else {
      prompt = `Generate a confirmation SMS reply for a legitimate transaction of GHS ${amount} to ${recipient || "someone"}. Reference: ${reference}. Time: ${timestamp.toLocaleTimeString()}. Risk: ${riskLevel}. Keep it friendly and concise. Max 160 characters.`;
    }

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    logger?.info(
      { replyLength: reply.length, riskLevel },
      "Chatbot reply generated"
    );

    return reply.substring(0, 160);
  } catch (error) {
    logger?.error(
      { err: error, riskLevel },
      "Failed to generate chatbot reply with AI"
    );
    return generateFallbackReply(riskLevel, amount, recipient, reference);
  }
}

function generateFallbackReply(
  riskLevel: string,
  amount: number,
  recipient: string | null,
  reference: string | null
): string {
  if (riskLevel === "CRITICAL" || riskLevel === "HIGH") {
    return `⚠️ FRAUD ALERT: GHS ${amount} to ${recipient || "unknown"}. Ref: ${reference}. DO NOT PROCEED. Contact support.`;
  } else {
    return `✅ Confirmed: Sent GHS ${amount} to ${recipient || "someone"}. Ref: ${reference}.`;
  }
}

export function registerChatbotAnalyzeRoutes(
  app: App,
  fastify: FastifyInstance
) {
  // POST /api/chatbot/analyze-sms
  fastify.post(
    "/api/chatbot/analyze-sms",
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

      const body = request.body as {
        smsMessage: string;
      };

      if (!body.smsMessage) {
        return {
          success: false,
          error: "smsMessage is required",
        };
      }

      app.logger.info(
        { userId, smsLength: body.smsMessage.length },
        "Chatbot SMS analysis requested"
      );

      try {
        // Generate transaction ID
        const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Execute 7-layer security analysis
        const analysis = await executeSecurityAnalysis(
          app,
          userId,
          transactionId,
          body.smsMessage,
          app.logger
        );

        const parsed = layer1_smsCaptureAndParsing(body.smsMessage);

        // Generate chatbot reply
        const chatbotReply = await generateChatbotReply(
          analysis.layer5.riskLevel,
          parsed.amount || 0,
          parsed.recipient,
          parsed.reference,
          parsed.timestamp,
          [],
          app.logger
        );

        // Create transaction record for audit trail
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
            riskReasons: Object.keys(analysis.layer5.breakdown).filter(
              (key) => analysis.layer5.breakdown[key as keyof typeof analysis.layer5.breakdown] > 0
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

        // Create alert if needed (use actual transaction UUID)
        if (analysis.layer6.shouldAlert) {
          await app.db.insert(schema.inAppAlerts).values({
            userId,
            transactionId: transaction.id,
            alertLevel: analysis.layer6.alertLevel as any,
            title: `${analysis.layer6.alertLevel} Risk Transaction Detected`,
            message: `A ${analysis.layer6.alertLevel.toLowerCase()}-risk transaction of GHS ${parsed.amount || 0} to ${parsed.recipient || "unknown"} was detected.`,
            riskScore: analysis.layer5.riskScore,
            riskReasons: Object.keys(analysis.layer5.breakdown).filter(
              (key) => analysis.layer5.breakdown[key as keyof typeof analysis.layer5.breakdown] > 0
            ),
          });

          app.logger.warn(
            { userId, transactionId, riskLevel: analysis.layer5.riskLevel },
            "Alert created for chatbot transaction"
          );
        }

        app.logger.info(
          { userId, transactionId, riskLevel: analysis.layer5.riskLevel },
          "Chatbot SMS analysis completed"
        );

        return {
          success: true,
          reply: chatbotReply,
          transactionAnalysis: {
            transactionId,
            layer1: {
              provider: analysis.layer1.provider,
              type: analysis.layer1.type,
              amount: analysis.layer1.amount,
              recipient: analysis.layer1.recipient,
              reference: analysis.layer1.reference,
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
          riskLevel: analysis.layer5.riskLevel,
          shouldAlert: analysis.layer6.shouldAlert,
          processingTimeMs: analysis.totalProcessingTimeMs,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          "Chatbot SMS analysis failed"
        );
        throw error;
      }
    }
  );
}
