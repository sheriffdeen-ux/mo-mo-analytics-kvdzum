import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, and, gte, lte } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";

export function registerChatbotStatsRoutes(
  app: App,
  fastify: FastifyInstance
) {
  // GET /api/chatbot/stats/dashboard
  // Dashboard statistics for user transactions
  fastify.get(
    "/api/chatbot/stats/dashboard",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        app.logger.warn({}, "Dashboard stats requested without auth");
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

      app.logger.info({ userId }, "Fetching dashboard statistics");

      try {
        // Get all user transactions
        const transactions = await app.db
          .select()
          .from(schema.transactions)
          .where(eq(schema.transactions.userId, userId));

        // Calculate today's statistics
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayTransactions = transactions.filter((t) => {
          const txDate = new Date(t.transactionDate);
          return txDate >= today && txDate < tomorrow;
        });

        const todayCount = todayTransactions.length;
        const todayAmount = todayTransactions.reduce(
          (sum, t) => sum + parseFloat(t.amount.toString()),
          0
        );
        const todayFlagged = todayTransactions.filter(
          (t) => t.riskLevel === "HIGH" || t.riskLevel === "CRITICAL"
        ).length;

        // Calculate all-time statistics
        const totalCount = transactions.length;
        const totalAmount = transactions.reduce(
          (sum, t) => sum + parseFloat(t.amount.toString()),
          0
        );
        const totalFlagged = transactions.filter(
          (t) => t.riskLevel === "HIGH" || t.riskLevel === "CRITICAL"
        ).length;

        // Risk distribution
        const riskDistribution = {
          LOW: transactions.filter((t) => t.riskLevel === "LOW").length,
          MEDIUM: transactions.filter((t) => t.riskLevel === "MEDIUM").length,
          HIGH: transactions.filter((t) => t.riskLevel === "HIGH").length,
          CRITICAL: transactions.filter((t) => t.riskLevel === "CRITICAL").length,
        };

        // Provider distribution
        const providerDistribution = {
          MTN: transactions.filter((t) => t.provider === "MTN").length,
          Vodafone: transactions.filter((t) => t.provider === "Vodafone").length,
          AirtelTigo: transactions.filter((t) => t.provider === "AirtelTigo").length,
        };

        // Transaction type distribution
        const typeDistribution = {
          sent: transactions.filter((t) => t.transactionType === "sent").length,
          received: transactions.filter((t) => t.transactionType === "received").length,
          withdrawal: transactions.filter((t) => t.transactionType === "withdrawal").length,
          deposit: transactions.filter((t) => t.transactionType === "deposit").length,
          airtime: transactions.filter((t) => (t.transactionType as any) === "airtime").length,
          bill_payment: transactions.filter((t) => (t.transactionType as any) === "bill_payment").length,
        };

        // Average transaction amount
        const avgAmount = totalCount > 0 ? totalAmount / totalCount : 0;

        // Get recent transactions
        const recent = transactions.sort((a, b) => {
          const dateA = new Date(a.transactionDate).getTime();
          const dateB = new Date(b.transactionDate).getTime();
          return dateB - dateA;
        }).slice(0, 5);

        // Get alerts count
        const alerts = await app.db
          .select()
          .from(schema.inAppAlerts)
          .where(eq(schema.inAppAlerts.userId, userId));

        const unreadAlerts = alerts.filter((a) => !a.isRead).length;
        const totalAlerts = alerts.length;

        app.logger.info(
          {
            userId,
            todayCount,
            totalCount,
            totalFlagged,
          },
          "Dashboard statistics calculated"
        );

        return reply.status(200).send({
          success: true,
          data: {
            today: {
              count: todayCount,
              totalAmount: parseFloat(todayAmount.toFixed(2)),
              flaggedCount: todayFlagged,
              avgAmount: todayCount > 0 ? parseFloat((todayAmount / todayCount).toFixed(2)) : 0,
            },
            allTime: {
              count: totalCount,
              totalAmount: parseFloat(totalAmount.toFixed(2)),
              flaggedCount: totalFlagged,
              avgAmount: parseFloat(avgAmount.toFixed(2)),
              flaggedPercentage: totalCount > 0 ? parseFloat(((totalFlagged / totalCount) * 100).toFixed(2)) : 0,
            },
            distribution: {
              riskLevel: riskDistribution,
              provider: providerDistribution,
              transactionType: typeDistribution,
            },
            alerts: {
              total: totalAlerts,
              unread: unreadAlerts,
            },
            recentTransactions: recent.slice(0, 5),
          },
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          "Failed to calculate dashboard statistics"
        );
        throw error;
      }
    }
  );

  // GET /api/chatbot/stats/fraud-report
  // Generate fraud report for date range
  fastify.get(
    "/api/chatbot/stats/fraud-report",
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
      const query = request.query as any;

      // Parse date range (defaults to last 30 days)
      let startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);

      let endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      if (query.startDate) {
        startDate = new Date(query.startDate);
        startDate.setHours(0, 0, 0, 0);
      }

      if (query.endDate) {
        endDate = new Date(query.endDate);
        endDate.setHours(23, 59, 59, 999);
      }

      app.logger.info(
        {
          userId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        "Fraud report requested"
      );

      try {
        // Get transactions in date range
        const transactions = await app.db
          .select()
          .from(schema.transactions)
          .where(
            and(
              eq(schema.transactions.userId, userId),
              gte(schema.transactions.transactionDate, startDate),
              lte(schema.transactions.transactionDate, endDate)
            )
          );

        // Filter high-risk transactions
        const fraudTransactions = transactions.filter(
          (t) => t.riskLevel === "HIGH" || t.riskLevel === "CRITICAL"
        );

        // Calculate statistics
        const totalTransactions = transactions.length;
        const totalAmount = transactions.reduce(
          (sum, t) => sum + parseFloat(t.amount.toString()),
          0
        );

        const fraudCount = fraudTransactions.length;
        const fraudAmount = fraudTransactions.reduce(
          (sum, t) => sum + parseFloat(t.amount.toString()),
          0
        );

        const fraudPercentage =
          totalTransactions > 0
            ? ((fraudCount / totalTransactions) * 100).toFixed(2)
            : "0.00";

        // Top flagged recipients
        const recipientFrequency: Record<string, { count: number; amount: number }> = {};
        fraudTransactions.forEach((t) => {
          const recipient = t.recipient || "Unknown";
          if (!recipientFrequency[recipient]) {
            recipientFrequency[recipient] = { count: 0, amount: 0 };
          }
          recipientFrequency[recipient].count += 1;
          recipientFrequency[recipient].amount += parseFloat(
            t.amount.toString()
          );
        });

        const topFlaggedRecipients = Object.entries(recipientFrequency)
          .map(([recipient, data]) => ({
            recipient,
            flagCount: data.count,
            totalAmount: parseFloat(data.amount.toFixed(2)),
          }))
          .sort((a, b) => b.flagCount - a.flagCount)
          .slice(0, 10);

        // Most common scam keywords
        const keywordFrequency: Record<string, number> = {};
        transactions.forEach((t) => {
          if (t.layer3ScamKeywords && Array.isArray(t.layer3ScamKeywords)) {
            (t.layer3ScamKeywords as string[]).forEach((keyword) => {
              keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
            });
          }
        });

        const topKeywords = Object.entries(keywordFrequency)
          .map(([keyword, count]) => ({ keyword, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        // Daily breakdown
        const dailyBreakdown: Record<string, { count: number; fraudCount: number; amount: number }> = {};

        transactions.forEach((t) => {
          const date = new Date(t.transactionDate);
          const dateStr = date.toISOString().split("T")[0];

          if (!dailyBreakdown[dateStr]) {
            dailyBreakdown[dateStr] = { count: 0, fraudCount: 0, amount: 0 };
          }

          dailyBreakdown[dateStr].count += 1;
          dailyBreakdown[dateStr].amount += parseFloat(t.amount.toString());

          if (t.riskLevel === "HIGH" || t.riskLevel === "CRITICAL") {
            dailyBreakdown[dateStr].fraudCount += 1;
          }
        });

        const daily = Object.entries(dailyBreakdown)
          .map(([date, data]) => ({
            date,
            totalTransactions: data.count,
            fraudTransactions: data.fraudCount,
            totalAmount: parseFloat(data.amount.toFixed(2)),
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        app.logger.info(
          {
            userId,
            totalTransactions,
            fraudCount,
            reportPeriod: `${startDate.toISOString()} to ${endDate.toISOString()}`,
          },
          "Fraud report generated"
        );

        return reply.status(200).send({
          success: true,
          report: {
            period: {
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            },
            summary: {
              totalTransactions,
              totalAmount: parseFloat(totalAmount.toFixed(2)),
              fraudCount,
              fraudAmount: parseFloat(fraudAmount.toFixed(2)),
              fraudPercentage: parseFloat(fraudPercentage),
            },
            topFlaggedRecipients,
            commonKeywords: topKeywords,
            dailyBreakdown: daily,
          },
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          "Failed to generate fraud report"
        );
        throw error;
      }
    }
  );
}
