import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, and, gte, lte } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";

// Helper to get start and end of day
function getDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

// Helper to get start and end of week
function getWeekRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day;
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

// Helper to get start and end of month
function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

// Calculate financial report from transactions
async function calculateFinancialReport(
  app: App,
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{
  totalSent: number;
  totalReceived: number;
  transactionCount: number;
  averageTransactionAmount: number;
  highestTransaction: number;
  lowestTransaction: number;
  fraudDetectedCount: number;
  transactions: any[];
}> {
  const txns = await app.db
    .select()
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.userId, userId),
        gte(schema.transactions.transactionDate, periodStart),
        lte(schema.transactions.transactionDate, periodEnd)
      )
    );

  const sentTxns = txns.filter((t) => t.transactionType === "sent");
  const receivedTxns = txns.filter((t) => t.transactionType === "received");

  const totalSent = sentTxns.reduce(
    (sum, t) => sum + parseFloat(t.amount.toString()),
    0
  );
  const totalReceived = receivedTxns.reduce(
    (sum, t) => sum + parseFloat(t.amount.toString()),
    0
  );

  const transactionCount = txns.length;
  const averageTransactionAmount =
    transactionCount > 0
      ? (totalSent + totalReceived) / transactionCount
      : 0;

  const amounts = txns.map((t) => parseFloat(t.amount.toString()));
  const highestTransaction = amounts.length > 0 ? Math.max(...amounts) : 0;
  const lowestTransaction = amounts.length > 0 ? Math.min(...amounts) : 0;

  const fraudDetectedCount = txns.filter(
    (t) => t.riskLevel && t.riskLevel !== "LOW"
  ).length;

  return {
    totalSent,
    totalReceived,
    transactionCount,
    averageTransactionAmount,
    highestTransaction,
    lowestTransaction,
    fraudDetectedCount,
    transactions: txns,
  };
}

export function registerFinancialReportsRoutes(
  app: App,
  fastify: FastifyInstance
) {
  // GET /api/financial-reports/daily
  fastify.get(
    "/api/financial-reports/daily",
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

      const query = request.query as { date?: string };
      const date = query.date ? new Date(query.date) : new Date();

      app.logger.info(
        { userId, date: date.toISOString() },
        "Fetching daily financial report"
      );

      try {
        const { start, end } = getDayRange(date);

        const report = await calculateFinancialReport(app, userId, start, end);

        app.logger.info(
          { userId, transactionCount: report.transactionCount },
          "Daily financial report calculated"
        );

        return {
          success: true,
          report: {
            period: "daily",
            periodStart: start.toISOString(),
            periodEnd: end.toISOString(),
            totalSent: report.totalSent.toFixed(2),
            totalReceived: report.totalReceived.toFixed(2),
            transactionCount: report.transactionCount,
            averageAmount: report.averageTransactionAmount.toFixed(2),
            highestTransaction: report.highestTransaction.toFixed(2),
            lowestTransaction: report.lowestTransaction.toFixed(2),
            fraudDetectedCount: report.fraudDetectedCount,
          },
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          "Failed to fetch daily financial report"
        );
        throw error;
      }
    }
  );

  // GET /api/financial-reports/weekly
  fastify.get(
    "/api/financial-reports/weekly",
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

      const query = request.query as { weekStart?: string };
      const weekStart = query.weekStart ? new Date(query.weekStart) : new Date();

      app.logger.info(
        { userId, weekStart: weekStart.toISOString() },
        "Fetching weekly financial report"
      );

      try {
        const { start, end } = getWeekRange(weekStart);

        const report = await calculateFinancialReport(app, userId, start, end);

        app.logger.info(
          { userId, transactionCount: report.transactionCount },
          "Weekly financial report calculated"
        );

        return {
          success: true,
          report: {
            period: "weekly",
            periodStart: start.toISOString(),
            periodEnd: end.toISOString(),
            totalSent: report.totalSent.toFixed(2),
            totalReceived: report.totalReceived.toFixed(2),
            transactionCount: report.transactionCount,
            averageAmount: report.averageTransactionAmount.toFixed(2),
            highestTransaction: report.highestTransaction.toFixed(2),
            lowestTransaction: report.lowestTransaction.toFixed(2),
            fraudDetectedCount: report.fraudDetectedCount,
          },
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          "Failed to fetch weekly financial report"
        );
        throw error;
      }
    }
  );

  // GET /api/financial-reports/monthly
  fastify.get(
    "/api/financial-reports/monthly",
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

      const query = request.query as { month?: string };
      const month = query.month ? new Date(query.month) : new Date();

      app.logger.info(
        { userId, month: month.toISOString() },
        "Fetching monthly financial report"
      );

      try {
        const { start, end } = getMonthRange(month);

        const report = await calculateFinancialReport(app, userId, start, end);

        app.logger.info(
          { userId, transactionCount: report.transactionCount },
          "Monthly financial report calculated"
        );

        return {
          success: true,
          report: {
            period: "monthly",
            periodStart: start.toISOString(),
            periodEnd: end.toISOString(),
            totalSent: report.totalSent.toFixed(2),
            totalReceived: report.totalReceived.toFixed(2),
            transactionCount: report.transactionCount,
            averageAmount: report.averageTransactionAmount.toFixed(2),
            highestTransaction: report.highestTransaction.toFixed(2),
            lowestTransaction: report.lowestTransaction.toFixed(2),
            fraudDetectedCount: report.fraudDetectedCount,
          },
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          "Failed to fetch monthly financial report"
        );
        throw error;
      }
    }
  );

  // POST /api/financial-reports/generate
  fastify.post(
    "/api/financial-reports/generate",
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
        reportType: "daily" | "weekly" | "monthly";
        periodStart: string;
        periodEnd: string;
      };

      if (!body.reportType || !body.periodStart || !body.periodEnd) {
        return {
          success: false,
          error: "Missing required fields: reportType, periodStart, periodEnd",
        };
      }

      app.logger.info(
        {
          userId,
          reportType: body.reportType,
          periodStart: body.periodStart,
          periodEnd: body.periodEnd,
        },
        "Generating financial report"
      );

      try {
        const periodStart = new Date(body.periodStart);
        const periodEnd = new Date(body.periodEnd);

        if (periodStart > periodEnd) {
          return {
            success: false,
            error: "periodStart must be before periodEnd",
          };
        }

        const report = await calculateFinancialReport(
          app,
          userId,
          periodStart,
          periodEnd
        );

        // Store report in database
        const [storedReport] = await app.db
          .insert(schema.financialReports)
          .values({
            userId,
            reportType: body.reportType,
            periodStart,
            periodEnd,
            totalSent: report.totalSent.toString(),
            totalReceived: report.totalReceived.toString(),
            transactionCount: report.transactionCount,
            averageTransactionAmount: report.averageTransactionAmount.toString(),
            highestTransaction: report.highestTransaction.toString(),
            lowestTransaction: report.lowestTransaction.toString(),
            fraudDetectedCount: report.fraudDetectedCount,
            reportData: {
              summary: {
                totalSent: report.totalSent,
                totalReceived: report.totalReceived,
                netFlow: report.totalReceived - report.totalSent,
              },
              statistics: {
                transactionCount: report.transactionCount,
                averageAmount: report.averageTransactionAmount,
                highestTransaction: report.highestTransaction,
                lowestTransaction: report.lowestTransaction,
              },
              fraud: {
                detectedCount: report.fraudDetectedCount,
                detectionRate:
                  report.transactionCount > 0
                    ? (report.fraudDetectedCount / report.transactionCount) * 100
                    : 0,
              },
            },
          })
          .returning();

        app.logger.info(
          {
            userId,
            reportId: storedReport.id,
            transactionCount: report.transactionCount,
          },
          "Financial report generated and stored"
        );

        return {
          success: true,
          report: {
            id: storedReport.id,
            reportType: storedReport.reportType,
            periodStart: storedReport.periodStart.toISOString(),
            periodEnd: storedReport.periodEnd.toISOString(),
            totalSent: report.totalSent.toFixed(2),
            totalReceived: report.totalReceived.toFixed(2),
            transactionCount: report.transactionCount,
            averageAmount: report.averageTransactionAmount.toFixed(2),
            highestTransaction: report.highestTransaction.toFixed(2),
            lowestTransaction: report.lowestTransaction.toFixed(2),
            fraudDetectedCount: report.fraudDetectedCount,
          },
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId, reportType: body.reportType },
          "Failed to generate financial report"
        );
        throw error;
      }
    }
  );
}
