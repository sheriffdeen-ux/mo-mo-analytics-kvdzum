import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";
import { parseTransaction } from "../utils/telecel-sms-parser.js";
import { executeFraudDetectionAnalysis } from "../utils/momo-fraud-agent.js";
import { eq } from "drizzle-orm";

export function registerMomoChatbotRoutes(
  app: App,
  fastify: FastifyInstance
) {
  /**
   * POST /api/chatbot/sms/analyze
   * Analyze SMS message using 7-layer fraud detection framework
   */
  fastify.post(
    "/api/chatbot/sms/analyze",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        app.logger.warn({}, "SMS analysis attempted without auth");
        return reply.status(401).send({
          success: false,
          error: "Unauthorized",
        });
      }

      const tokenParts = token.split(":");
      if (tokenParts.length < 1) {
        app.logger.warn({}, "SMS analysis attempted with invalid token");
        return reply.status(401).send({
          success: false,
          error: "Invalid token format",
        });
      }

      const userId = tokenParts[0];
      const body = request.body as { smsMessage: string };

      if (!body.smsMessage || typeof body.smsMessage !== "string") {
        app.logger.warn({ userId }, "SMS analysis called without SMS message");
        return reply.status(400).send({
          success: false,
          error: "smsMessage is required and must be a string",
        });
      }

      app.logger.info(
        { userId, smsLength: body.smsMessage.length },
        "MoMo fraud detection analysis requested"
      );

      try {
        // Parse SMS
        const parsed = parseTransaction(body.smsMessage);

        // Check if it's from a known MoMo provider first
        if (!parsed.provider) {
          app.logger.info(
            { userId },
            "SMS is not from a known MoMo provider"
          );

          return reply.status(400).send({
            success: false,
            error:
              "This doesn't appear to be from a known MoMo provider (MTN, Vodafone, Telecel, AirtelTigo). Please paste a valid MoMo SMS.",
            details: {
              rawSms: body.smsMessage,
            },
          });
        }

        // If it's a MoMo message but not a recognized transaction type, mark as "other"
        if (!parsed.type && parsed.provider) {
          parsed.type = "other" as any;
        }

        // Validate it's a valid MoMo transaction or message
        if (!parsed.isValidTransaction && parsed.type !== "other") {
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
              rawSms: body.smsMessage,
            },
          });
        }

        // Execute 7-layer fraud detection
        const analysis = await executeFraudDetectionAnalysis(
          app,
          userId,
          parsed,
          body.smsMessage
        );

        // Generate chatbot reply
        const chatbotReply = generateChatbotReply(parsed, analysis);

        // Create transaction record
        const transactionTypeValue: "sent" | "received" | "cash_out" | "withdrawal" | "deposit" | "airtime" | "bill_payment" | "balance_inquiry" | "failed" | "promotional" | "other" =
          (parsed.type as any) || "other";

        const providerValue: "MTN" | "Vodafone" | "AirtelTigo" | "Telecel Cash" | "MTN MOBILE MONEY" =
          (parsed.provider as any) || "MTN";

        const [transaction] = await app.db
          .insert(schema.transactions)
          .values({
            userId,
            rawSms: body.smsMessage,
            provider: providerValue,
            transactionType: transactionTypeValue,
            amount: (parsed.amount || 0).toString(),
            recipient:
              parsed.type === "sent"
                ? parsed.receiverName || parsed.receiverNumber
                : parsed.type === "received"
                ? parsed.senderName || parsed.senderNumber
                : parsed.type === "cash_out"
                ? parsed.merchantName
                : parsed.type === "bill_payment"
                ? parsed.billerName
                : null,
            balance: parsed.balance?.toString(),
            transactionDate: new Date(
              `${parsed.transactionDate}T${parsed.time || "00:00:00"}Z`
            ),
            riskScore: analysis.riskScore,
            riskLevel: (analysis.riskLevel as any) || "LOW",
            riskReasons: analysis.riskFactors,
            layer1SmsRaw: body.smsMessage,
            layer2ValidationStatus: analysis.layerAnalysis.layer2.status,
            layer3NlpScore: analysis.layerAnalysis.layer3.totalPatternScore.toString() as any,
            layer3ScamKeywords: analysis.layerAnalysis.layer3.scamKeywordCount > 0
              ? ["scam_keywords_detected"]
              : [],
            layer4VelocityScore: analysis.layerAnalysis.layer4.anomalyScore.toString() as any,
            layer4AnomalyDetected:
              analysis.layerAnalysis.layer4.anomalyScore > 0,
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
            },
          })
          .returning();

        // Create alert if needed
        if (analysis.shouldAlert) {
          await app.db.insert(schema.inAppAlerts).values({
            userId,
            transactionId: transaction.id,
            alertLevel: analysis.riskLevel as any,
            title: `${analysis.riskLevel} Risk Transaction Detected`,
            message: analysis.riskFactors.join("; "),
            riskScore: analysis.riskScore,
            riskReasons: analysis.riskFactors,
            isRead: false,
          });

          app.logger.warn(
            {
              userId,
              transactionId: transaction.id,
              riskLevel: analysis.riskLevel,
              riskScore: analysis.riskScore,
            },
            "FRAUD ALERT: High-risk transaction detected"
          );
        }

        app.logger.info(
          {
            userId,
            transactionId: transaction.id,
            riskLevel: analysis.riskLevel,
            riskScore: analysis.riskScore,
            amount: parsed.amount,
          },
          "MoMo fraud detection analysis completed"
        );

        return reply.status(200).send({
          success: true,
          chatbotReply,
          analysis: {
            riskScore: analysis.riskScore,
            riskLevel: analysis.riskLevel,
            riskFactors: analysis.riskFactors,
            shouldAlert: analysis.shouldAlert,
            recommendedActions: analysis.recommendedActions,
            transactionId: transaction.id,
          },
          transaction: {
            provider: parsed.provider,
            type: parsed.type,
            amount: parsed.amount,
            recipient:
              parsed.type === "sent"
                ? parsed.receiverName || parsed.receiverNumber
                : parsed.type === "received"
                ? parsed.senderName || parsed.senderNumber
                : parsed.type === "cash_out"
                ? parsed.merchantName
                : parsed.type === "bill_payment"
                ? parsed.billerName
                : null,
            date: parsed.transactionDate,
            time: parsed.time,
            balance: parsed.balance,
          },
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId, smsLength: body.smsMessage?.length },
          "MoMo fraud detection analysis failed"
        );
        throw error;
      }
    }
  );

  /**
   * POST /api/chatbot/command
   * Handle chatbot commands
   */
  fastify.post(
    "/api/chatbot/command",
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
      const body = request.body as { command: string; args?: string };

      const command = body.command?.toUpperCase() || "";

      app.logger.info(
        { userId, command, args: body.args },
        "Chatbot command received"
      );

      try {
        switch (command) {
          case "HELP":
            return reply.status(200).send({
              success: true,
              response: `
🤖 MoMo Fraud Detection Chatbot Commands:

📊 STATS - Show transaction statistics
📅 TODAY - Today's transactions
📆 WEEK - This week's summary
💰 BUDGET [amount] - Set daily spending limit
🔔 ALERTS ON/OFF - Toggle notifications
📜 HISTORY - Recent transactions
ℹ️ HELP - Show this help message

Just forward your MoMo SMS to analyze for fraud risk!
              `,
            });

          case "STATS":
            return await handleStatsCommand(app, reply, userId);

          case "TODAY":
            return await handleTodayCommand(app, reply, userId);

          case "WEEK":
            return await handleWeekCommand(app, reply, userId);

          case "BUDGET":
            return await handleBudgetCommand(app, reply, userId, body.args);

          case "ALERTS":
            return await handleAlertsCommand(app, reply, userId, body.args);

          case "HISTORY":
            return await handleHistoryCommand(app, reply, userId);

          default:
            return reply.status(400).send({
              success: false,
              error: "Unknown command. Type HELP for available commands.",
            });
        }
      } catch (error) {
        app.logger.error(
          { err: error, userId, command },
          "Chatbot command failed"
        );
        throw error;
      }
    }
  );

  /**
   * GET /api/chatbot/stats
   * Get user transaction statistics
   */
  fastify.get(
    "/api/chatbot/stats",
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

      app.logger.info({ userId }, "Fetching user statistics");

      try {
        // Get all user transactions
        const transactions = await app.db
          .select()
          .from(schema.transactions)
          .where(eq(schema.transactions.userId, userId));

        // Calculate statistics
        const totalCount = transactions.length;
        const totalAmount = transactions.reduce(
          (sum, t) => sum + parseFloat(t.amount.toString()),
          0
        );
        const flaggedCount = transactions.filter(
          (t) => t.riskLevel === "HIGH" || t.riskLevel === "CRITICAL"
        ).length;

        return reply.status(200).send({
          success: true,
          stats: {
            totalTransactions: totalCount,
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            flaggedTransactions: flaggedCount,
            averageAmount:
              totalCount > 0
                ? parseFloat((totalAmount / totalCount).toFixed(2))
                : 0,
            riskDistribution: {
              LOW: transactions.filter((t) => t.riskLevel === "LOW").length,
              MEDIUM: transactions.filter(
                (t) => t.riskLevel === "MEDIUM"
              ).length,
              HIGH: transactions.filter((t) => t.riskLevel === "HIGH").length,
              CRITICAL: transactions.filter(
                (t) => t.riskLevel === "CRITICAL"
              ).length,
            },
          },
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          "Failed to fetch statistics"
        );
        throw error;
      }
    }
  );

  /**
   * PUT /api/chatbot/settings
   * Update chatbot settings
   */
  fastify.put(
    "/api/chatbot/settings",
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
        dailySpendingLimit?: number;
        alertsEnabled?: boolean;
      };

      app.logger.info({ userId, settings: body }, "Updating chatbot settings");

      try {
        // Update or create user settings
        let settings = await app.db
          .select()
          .from(schema.userSettings)
          .where(eq(schema.userSettings.userId, userId))
          .limit(1);

        if (settings.length > 0) {
          const [updated] = await app.db
            .update(schema.userSettings)
            .set({
              dailySpendingLimit: body.dailySpendingLimit
                ? body.dailySpendingLimit.toString()
                : settings[0].dailySpendingLimit,
              alertsEnabled: body.alertsEnabled ?? settings[0].alertsEnabled,
            })
            .where(eq(schema.userSettings.userId, userId))
            .returning();

          return reply.status(200).send({
            success: true,
            settings: updated,
          });
        } else {
          const [created] = await app.db
            .insert(schema.userSettings)
            .values({
              userId,
              dailySpendingLimit: body.dailySpendingLimit?.toString(),
              alertsEnabled: body.alertsEnabled ?? true,
            })
            .returning();

          return reply.status(200).send({
            success: true,
            settings: created,
          });
        }
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          "Failed to update settings"
        );
        throw error;
      }
    }
  );
}

/**
 * Helper function to generate chatbot reply
 * Handles all message types: received, sent, cash_out, airtime, bill_payment,
 * balance_inquiry, failed, promotional, and other MoMo messages
 */
function generateChatbotReply(
  parsed: ReturnType<typeof parseTransaction>,
  analysis: Awaited<ReturnType<typeof executeFraudDetectionAnalysis>>
): string {
  const balance = parsed.balance ? `GHS ${parsed.balance.toFixed(2)}` : "N/A";
  const timestamp = parsed.time ? `${parsed.time}` : "Unknown time";
  const date = parsed.transactionDate ? `${parsed.transactionDate} at ` : "";

  // Build reply based on transaction type
  switch (parsed.type) {
    case "received":
      return `✅ You received GHS ${(parsed.amount || 0).toFixed(2)} from ${
        parsed.senderName || parsed.senderNumber || "Unknown"
      } at ${timestamp}. Balance: ${balance}. Risk: ${analysis.riskLevel}`;

    case "sent":
      return `✅ You sent GHS ${(parsed.amount || 0).toFixed(2)} to ${
        parsed.receiverName || parsed.receiverNumber || "Unknown"
      } at ${timestamp}. Balance: ${balance}. Risk: ${analysis.riskLevel}`;

    case "cash_out":
      return `✅ Cash withdrawal of GHS ${(parsed.amount || 0).toFixed(2)} at ${
        parsed.merchantName || "Unknown merchant"
      }. Balance: ${balance}. Risk: ${analysis.riskLevel}`;

    case "airtime":
      return `✅ Airtime purchase of GHS ${(parsed.amount || 0).toFixed(2)} at ${timestamp}. Balance: ${balance}. Risk: ${analysis.riskLevel}`;

    case "bill_payment":
      return `✅ Bill payment of GHS ${(parsed.amount || 0).toFixed(2)} to ${
        parsed.billerName || "Unknown biller"
      } at ${timestamp}. Balance: ${balance}. Risk: ${analysis.riskLevel}`;

    case "balance_inquiry":
      return `ℹ️ Your current balance is ${balance} as of ${timestamp}.`;

    case "failed":
      return `ℹ️ Transaction failed at ${timestamp}. Your balance remains ${balance}.`;

    case "promotional":
      return `ℹ️ Promotional message from ${parsed.provider || "your MoMo provider"}. This is informational only.`;

    case "other":
      return `ℹ️ MoMo message received from ${parsed.provider || "your MoMo provider"}. Unable to extract full transaction details, but this appears to be a legitimate message.`;

    default:
      // Fallback for any unhandled types
      return `ℹ️ MoMo message received from ${parsed.provider || "your MoMo provider"}. Balance: ${balance}.`;
  }
}

/**
 * Command handlers
 */

async function handleStatsCommand(
  app: App,
  reply: FastifyReply,
  userId: string
) {
  const transactions = await app.db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.userId, userId));

  const totalAmount = transactions.reduce(
    (sum, t) => sum + parseFloat(t.amount.toString()),
    0
  );
  const flaggedCount = transactions.filter(
    (t) => t.riskLevel === "HIGH" || t.riskLevel === "CRITICAL"
  ).length;

  return reply.status(200).send({
    success: true,
    response: `
📊 YOUR TRANSACTION STATISTICS

Total Transactions: ${transactions.length}
Total Amount: GHS ${totalAmount.toFixed(2)}
Flagged Transactions: ${flaggedCount}
Average Amount: GHS ${transactions.length > 0 ? (totalAmount / transactions.length).toFixed(2) : "0"}

Risk Distribution:
- LOW: ${transactions.filter((t) => t.riskLevel === "LOW").length}
- MEDIUM: ${transactions.filter((t) => t.riskLevel === "MEDIUM").length}
- HIGH: ${transactions.filter((t) => t.riskLevel === "HIGH").length}
- CRITICAL: ${transactions.filter((t) => t.riskLevel === "CRITICAL").length}
    `,
  });
}

async function handleTodayCommand(
  app: App,
  reply: FastifyReply,
  userId: string
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const transactions = await app.db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.userId, userId));

  const todayTx = transactions.filter(
    (t) => new Date(t.transactionDate) >= today && new Date(t.transactionDate) < tomorrow
  );

  const totalAmount = todayTx.reduce(
    (sum, t) => sum + parseFloat(t.amount.toString()),
    0
  );

  return reply.status(200).send({
    success: true,
    response: `
📅 TODAY'S TRANSACTIONS

Count: ${todayTx.length}
Total Amount: GHS ${totalAmount.toFixed(2)}
Average: GHS ${todayTx.length > 0 ? (totalAmount / todayTx.length).toFixed(2) : "0"}

Recent Transactions:
${todayTx
  .slice(-5)
  .map(
    (t) =>
      `- GHS ${t.amount} (${t.transactionType}) - Risk: ${t.riskLevel}`
  )
  .join("\n")}
    `,
  });
}

async function handleWeekCommand(
  app: App,
  reply: FastifyReply,
  userId: string
) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  const transactions = await app.db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.userId, userId));

  const weekTx = transactions.filter(
    (t) => new Date(t.transactionDate) >= weekAgo
  );

  const totalAmount = weekTx.reduce(
    (sum, t) => sum + parseFloat(t.amount.toString()),
    0
  );
  const flaggedCount = weekTx.filter(
    (t) => t.riskLevel === "HIGH" || t.riskLevel === "CRITICAL"
  ).length;

  return reply.status(200).send({
    success: true,
    response: `
📆 THIS WEEK'S SUMMARY

Total Transactions: ${weekTx.length}
Total Amount: GHS ${totalAmount.toFixed(2)}
Flagged: ${flaggedCount}

Daily Average: GHS ${weekTx.length > 0 ? (totalAmount / 7).toFixed(2) : "0"}
    `,
  });
}

async function handleBudgetCommand(
  app: App,
  reply: FastifyReply,
  userId: string,
  args?: string
) {
  if (!args || isNaN(parseFloat(args))) {
    return reply.status(400).send({
      success: false,
      error: "Usage: BUDGET [amount]",
    });
  }

  const limit = parseFloat(args);

  // Update settings
  let settings = await app.db
    .select()
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId))
    .limit(1);

  if (settings.length > 0) {
    await app.db
      .update(schema.userSettings)
      .set({ dailySpendingLimit: limit.toString() })
      .where(eq(schema.userSettings.userId, userId));
  } else {
    await app.db.insert(schema.userSettings).values({
      userId,
      dailySpendingLimit: limit.toString(),
    });
  }

  return reply.status(200).send({
    success: true,
    response: `💰 Daily spending limit set to GHS ${limit.toFixed(2)}`,
  });
}

async function handleAlertsCommand(
  app: App,
  reply: FastifyReply,
  userId: string,
  args?: string
) {
  const action = args?.toUpperCase() || "";

  if (!["ON", "OFF"].includes(action)) {
    return reply.status(400).send({
      success: false,
      error: "Usage: ALERTS ON or ALERTS OFF",
    });
  }

  const enabled = action === "ON";

  // Update settings
  let settings = await app.db
    .select()
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId))
    .limit(1);

  if (settings.length > 0) {
    await app.db
      .update(schema.userSettings)
      .set({ alertsEnabled: enabled })
      .where(eq(schema.userSettings.userId, userId));
  } else {
    await app.db.insert(schema.userSettings).values({
      userId,
      alertsEnabled: enabled,
    });
  }

  return reply.status(200).send({
    success: true,
    response: `🔔 Alerts ${enabled ? "ENABLED" : "DISABLED"}`,
  });
}

async function handleHistoryCommand(
  app: App,
  reply: FastifyReply,
  userId: string
) {
  const transactions = await app.db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.userId, userId))
    .orderBy(schema.transactions.createdAt)
    .limit(10);

  const recentTransactions = transactions
    .reverse()
    .map(
      (t) =>
        `- GHS ${t.amount} (${t.transactionType}) - Risk: ${t.riskLevel} - ${t.recipient}`
    )
    .join("\n");

  return reply.status(200).send({
    success: true,
    response: `
📜 RECENT TRANSACTIONS

${recentTransactions || "No transactions yet"}
    `,
  });
}
