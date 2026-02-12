import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, and, gte, lte, count as countFn, sum, desc, sql } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";

export function registerAnalyticsRoutes(app: App, fastify: FastifyInstance) {
  const requireAuth = app.requireAuth();

  // GET /api/analytics/summary - Get financial analytics summary
  fastify.get("/api/analytics/summary", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, "Fetching analytics summary");

    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

      // Get all user transactions
      const transactions = await app.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.userId, session.user.id));

      // Total sent (sent transactions)
      const sentResult = await app.db
        .select({
          total: sum(schema.transactions.amount),
        })
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.userId, session.user.id),
            eq(schema.transactions.transactionType, "sent" as any)
          )
        );

      const totalSent = sentResult[0]?.total
        ? parseFloat(sentResult[0].total as any)
        : 0;

      // Total received (received transactions)
      const receivedResult = await app.db
        .select({
          total: sum(schema.transactions.amount),
        })
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.userId, session.user.id),
            eq(schema.transactions.transactionType, "received" as any)
          )
        );

      const totalReceived = receivedResult[0]?.total
        ? parseFloat(receivedResult[0].total as any)
        : 0;

      // Fraud detected (HIGH and CRITICAL)
      const fraudDetected = transactions.filter(
        (t) => t.riskLevel === "HIGH" || t.riskLevel === "CRITICAL"
      ).length;

      // Money protected (sum of blocked/reported transactions)
      const protectedResult = await app.db
        .select({
          total: sum(schema.transactions.amount),
        })
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.userId, session.user.id),
            // Blocked or reported
            sql`(${schema.transactions.isBlocked} = true OR ${schema.transactions.isFraudReported} = true)`
          )
        );

      const moneyProtected = protectedResult[0]?.total
        ? parseFloat(protectedResult[0].total as any)
        : 0;

      // Daily stats (last 7 days)
      const dailyStats = [];
      for (let i = 6; i >= 0; i--) {
        const dayDate = new Date(now);
        dayDate.setDate(dayDate.getDate() - i);
        const dayStart = new Date(dayDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayDate);
        dayEnd.setHours(23, 59, 59, 999);

        const sentDayResult = await app.db
          .select({
            total: sum(schema.transactions.amount),
          })
          .from(schema.transactions)
          .where(
            and(
              eq(schema.transactions.userId, session.user.id),
              eq(schema.transactions.transactionType, "sent" as any),
              gte(schema.transactions.createdAt, dayStart),
              lte(schema.transactions.createdAt, dayEnd)
            )
          );

        const receivedDayResult = await app.db
          .select({
            total: sum(schema.transactions.amount),
          })
          .from(schema.transactions)
          .where(
            and(
              eq(schema.transactions.userId, session.user.id),
              eq(schema.transactions.transactionType, "received" as any),
              gte(schema.transactions.createdAt, dayStart),
              lte(schema.transactions.createdAt, dayEnd)
            )
          );

        dailyStats.push({
          date: dayDate.toISOString().split("T")[0],
          sent: sentDayResult[0]?.total
            ? parseFloat(sentDayResult[0].total as any)
            : 0,
          received: receivedDayResult[0]?.total
            ? parseFloat(receivedDayResult[0].total as any)
            : 0,
        });
      }

      // Weekly stats (last 4 weeks)
      const weeklyStats = [];
      for (let i = 3; i >= 0; i--) {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - i * 7);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);
        weekEnd.setHours(23, 59, 59, 999);

        const sentWeekResult = await app.db
          .select({
            total: sum(schema.transactions.amount),
          })
          .from(schema.transactions)
          .where(
            and(
              eq(schema.transactions.userId, session.user.id),
              eq(schema.transactions.transactionType, "sent" as any),
              gte(schema.transactions.createdAt, weekStart),
              lte(schema.transactions.createdAt, weekEnd)
            )
          );

        const receivedWeekResult = await app.db
          .select({
            total: sum(schema.transactions.amount),
          })
          .from(schema.transactions)
          .where(
            and(
              eq(schema.transactions.userId, session.user.id),
              eq(schema.transactions.transactionType, "received" as any),
              gte(schema.transactions.createdAt, weekStart),
              lte(schema.transactions.createdAt, weekEnd)
            )
          );

        weeklyStats.push({
          weekStart: weekStart.toISOString().split("T")[0],
          weekEnd: weekEnd.toISOString().split("T")[0],
          sent: sentWeekResult[0]?.total
            ? parseFloat(sentWeekResult[0].total as any)
            : 0,
          received: receivedWeekResult[0]?.total
            ? parseFloat(receivedWeekResult[0].total as any)
            : 0,
        });
      }

      // Monthly stats (last 6 months)
      const monthlyStats = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now);
        monthDate.setMonth(monthDate.getMonth() - i);
        const monthStart = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth(),
          1
        );
        const monthEnd = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );

        const sentMonthResult = await app.db
          .select({
            total: sum(schema.transactions.amount),
          })
          .from(schema.transactions)
          .where(
            and(
              eq(schema.transactions.userId, session.user.id),
              eq(schema.transactions.transactionType, "sent" as any),
              gte(schema.transactions.createdAt, monthStart),
              lte(schema.transactions.createdAt, monthEnd)
            )
          );

        const receivedMonthResult = await app.db
          .select({
            total: sum(schema.transactions.amount),
          })
          .from(schema.transactions)
          .where(
            and(
              eq(schema.transactions.userId, session.user.id),
              eq(schema.transactions.transactionType, "received" as any),
              gte(schema.transactions.createdAt, monthStart),
              lte(schema.transactions.createdAt, monthEnd)
            )
          );

        const monthName = monthStart.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        monthlyStats.push({
          month: monthName,
          sent: sentMonthResult[0]?.total
            ? parseFloat(sentMonthResult[0].total as any)
            : 0,
          received: receivedMonthResult[0]?.total
            ? parseFloat(receivedMonthResult[0].total as any)
            : 0,
        });
      }

      app.logger.info(
        {
          userId: session.user.id,
          totalSent,
          totalReceived,
          fraudDetected,
        },
        "Analytics summary fetched"
      );

      return {
        totalSent,
        totalReceived,
        dailyStats,
        weeklyStats,
        monthlyStats,
        fraudDetected,
        moneyProtected,
      };
    } catch (error) {
      app.logger.error(
        { err: error, userId: session.user.id },
        "Failed to fetch analytics summary"
      );
      throw error;
    }
  });

  // GET /api/analytics/fraud-trends - Get fraud trends (admin only)
  fastify.get("/api/analytics/fraud-trends", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info(
      { userId: session.user.id },
      "Fetching fraud trends (admin)"
    );

    try {
      // For now, return fraud trends for the current user
      // In a full implementation, this would be admin-only and return system-wide data
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get transactions in last 30 days
      const transactions = await app.db
        .select()
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.userId, session.user.id),
            gte(schema.transactions.createdAt, thirtyDaysAgo)
          )
        )
        .orderBy(desc(schema.transactions.createdAt));

      // Count fraud by hour
      const fraudByHour: Record<number, number> = {};
      transactions.forEach((t) => {
        if (t.riskLevel === "HIGH" || t.riskLevel === "CRITICAL") {
          const hour = t.transactionDate.getHours();
          fraudByHour[hour] = (fraudByHour[hour] || 0) + 1;
        }
      });

      // Get top flagged merchants
      const merchantFraudCount: Record<string, number> = {};
      transactions
        .filter((t) => t.riskLevel === "HIGH" || t.riskLevel === "CRITICAL")
        .forEach((t) => {
          if (t.recipient) {
            merchantFraudCount[t.recipient] =
              (merchantFraudCount[t.recipient] || 0) + 1;
          }
        });

      const topFlaggedMerchants = Object.entries(merchantFraudCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([merchant, count]) => ({
          merchant,
          fraudCount: count,
        }));

      // Provider breakdown
      const providerBreakdown: Record<string, number> = {};
      transactions
        .filter((t) => t.riskLevel === "HIGH" || t.riskLevel === "CRITICAL")
        .forEach((t) => {
          providerBreakdown[t.provider] =
            (providerBreakdown[t.provider] || 0) + 1;
        });

      const peakFraudHours = Object.entries(fraudByHour)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([hour, count]) => ({
          hour: parseInt(hour, 10),
          fraudCount: count,
        }));

      app.logger.info(
        { userId: session.user.id, fraudTrendCount: peakFraudHours.length },
        "Fraud trends fetched"
      );

      return {
        peakFraudTimes: peakFraudHours,
        topFlaggedMerchants,
        providerBreakdown,
        totalFraudDetected: transactions.filter(
          (t) => t.riskLevel === "HIGH" || t.riskLevel === "CRITICAL"
        ).length,
      };
    } catch (error) {
      app.logger.error(
        { err: error, userId: session.user.id },
        "Failed to fetch fraud trends"
      );
      throw error;
    }
  });
}
