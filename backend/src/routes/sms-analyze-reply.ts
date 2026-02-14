import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, and } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// Lazy initialization of Gemini client
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

// Fraud detection scoring (simple implementation)
function calculateFraudScore(
  amount: number,
  timeOfDay: number,
  frequencyToday: number
): { score: number; level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Amount check
  if (amount > 5000) {
    score += 20;
    reasons.push("High transaction amount");
  } else if (amount > 2000) {
    score += 10;
    reasons.push("Moderate transaction amount");
  }

  // Time check (unusual hours: midnight to 5am)
  if (timeOfDay >= 0 && timeOfDay <= 5) {
    score += 15;
    reasons.push("Unusual transaction time");
  }

  // Frequency check
  if (frequencyToday > 5) {
    score += 20;
    reasons.push("High transaction frequency");
  }

  let level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  if (score >= 75) {
    level = "CRITICAL";
  } else if (score >= 50) {
    level = "HIGH";
  } else if (score >= 25) {
    level = "MEDIUM";
  } else {
    level = "LOW";
  }

  return { score, level, reasons };
}

// Generate AI reply using Gemini
async function generateAiReply(
  amount: string,
  reference: string,
  timestamp: Date,
  transactionType: "sent" | "received",
  includeDailySummary: boolean,
  dailySent?: string,
  dailyReceived?: string,
  customTemplate?: string,
  logger?: any
): Promise<string | null> {
  try {
    const gemini = getGeminiClient();

    if (!gemini) {
      logger?.warn("Gemini API key not configured");
      return null;
    }

    const model = gemini.getGenerativeModel({ model: "gemini-pro" });

    const timeStr = timestamp.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    let prompt = `Generate a brief, friendly SMS reply confirming a ${transactionType} transaction of GHS ${amount} with reference ${reference} at ${timeStr}. Keep it under 160 characters if possible, max 320 characters. Respond with only the SMS text, no quotes or additional text.`;

    if (includeDailySummary && dailySent && dailyReceived) {
      prompt += ` Include today's summary: Sent GHS ${dailySent}, Received GHS ${dailyReceived}.`;
    }

    if (customTemplate) {
      prompt = `Using this template: "${customTemplate}", generate an SMS reply for a ${transactionType} transaction of GHS ${amount} with reference ${reference} at ${timeStr}. Keep it concise (under 320 characters). Respond with only the SMS text.`;
    }

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    logger?.info(
      { replyLength: reply.length, amount, reference },
      "AI reply generated successfully"
    );

    return reply.substring(0, 320); // Ensure it's not too long
  } catch (error) {
    logger?.error(
      { err: error, amount, reference },
      "Failed to generate AI reply"
    );
    return null;
  }
}

export function registerSmsAnalyzeReplyRoutes(
  app: App,
  fastify: FastifyInstance
) {
  // POST /api/sms/analyze-and-reply
  fastify.post(
    "/api/sms/analyze-and-reply",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return reply.status(401).send({
          success: false,
          error: "Unauthorized",
        });
      }

      // Extract userId from token
      const tokenParts = token.split(":");
      if (tokenParts.length < 1) {
        return reply.status(401).send({
          success: false,
          error: "Invalid token format",
        });
      }

      const userId = tokenParts[0];

      const body = request.body as {
        transactionId: string;
        smsContent: string;
        amount: number;
        timestamp: string;
        reference: string;
        transactionType: "sent" | "received";
      };

      // Validate request
      if (
        !body.transactionId ||
        !body.smsContent ||
        !body.amount ||
        !body.timestamp ||
        !body.reference ||
        !body.transactionType
      ) {
        return {
          success: false,
          error: "Missing required fields",
        };
      }

      app.logger.info(
        { userId, transactionId: body.transactionId, amount: body.amount },
        "Analyzing transaction for fraud and generating reply"
      );

      try {
        // Calculate fraud score
        const transactionDate = new Date(body.timestamp);
        const timeOfDay = transactionDate.getHours();

        // Count transactions today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayTransactions = await app.db
          .select()
          .from(schema.transactions)
          .where(
            and(
              eq(schema.transactions.userId, userId),
              eq(schema.transactions.transactionType, body.transactionType)
            )
          );

        const frequencyToday = todayTransactions.length;

        const fraudAnalysis = calculateFraudScore(
          body.amount,
          timeOfDay,
          frequencyToday
        );

        app.logger.info(
          {
            userId,
            transactionId: body.transactionId,
            riskScore: fraudAnalysis.score,
            riskLevel: fraudAnalysis.level,
          },
          "Fraud analysis completed"
        );

        // Get user's auto-reply settings
        let [settings] = await app.db
          .select()
          .from(schema.smsAutoReplySettings)
          .where(eq(schema.smsAutoReplySettings.userId, userId));

        // Create default settings if not found
        if (!settings) {
          const [newSettings] = await app.db
            .insert(schema.smsAutoReplySettings)
            .values({
              userId,
              autoReplyEnabled: true,
              replyOnlyNoFraud: true,
            })
            .returning();
          settings = newSettings;
        }

        let aiReply: string | undefined;
        let aiReplyGenerated = false;

        // Generate reply if conditions are met
        if (
          settings.autoReplyEnabled &&
          (!settings.replyOnlyNoFraud || fraudAnalysis.level === "LOW")
        ) {
          // Calculate daily summary if needed
          let dailySent: string | undefined;
          let dailyReceived: string | undefined;

          if (settings.includeDailySummary) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const sentTxns = await app.db
              .select()
              .from(schema.transactions)
              .where(
                and(
                  eq(schema.transactions.userId, userId),
                  eq(schema.transactions.transactionType, "sent")
                )
              );

            const receivedTxns = await app.db
              .select()
              .from(schema.transactions)
              .where(
                and(
                  eq(schema.transactions.userId, userId),
                  eq(schema.transactions.transactionType, "received")
                )
              );

            dailySent = sentTxns
              .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)
              .toFixed(2);

            dailyReceived = receivedTxns
              .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)
              .toFixed(2);
          }

          // Generate AI reply
          aiReply = await generateAiReply(
            body.amount.toString(),
            body.reference,
            transactionDate,
            body.transactionType,
            settings.includeDailySummary || false,
            dailySent,
            dailyReceived,
            settings.customReplyTemplate || undefined,
            app.logger
          );

          if (aiReply) {
            aiReplyGenerated = true;

            // Update transaction with AI reply
            await app.db
              .update(schema.transactions)
              .set({
                aiReplyGenerated: true,
                aiReplyContent: aiReply,
                aiReplyTimestamp: new Date(),
              })
              .where(eq(schema.transactions.id, body.transactionId));

            app.logger.info(
              {
                userId,
                transactionId: body.transactionId,
                replyLength: aiReply.length,
              },
              "AI reply stored in transaction"
            );
          }
        }

        return {
          success: true,
          fraudDetected: fraudAnalysis.level !== "LOW",
          riskScore: fraudAnalysis.score,
          riskLevel: fraudAnalysis.level,
          riskReasons: fraudAnalysis.reasons,
          aiReply: aiReplyGenerated ? aiReply : undefined,
          aiReplyGenerated,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId, transactionId: body.transactionId },
          "Failed to analyze transaction and generate reply"
        );
        throw error;
      }
    }
  );
}
