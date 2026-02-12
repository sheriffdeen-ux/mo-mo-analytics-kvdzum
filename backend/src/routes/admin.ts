import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, sum, count as countFn } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";

export function registerAdminRoutes(app: App, fastify: FastifyInstance) {
  const requireAuth = app.requireAuth();

  // GET /api/admin/users - Get list of users with activity stats (admin only)
  fastify.get("/api/admin/users", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    // Note: In a full implementation, check for admin role
    // For now, we'll allow any authenticated user
    app.logger.info({ userId: session.user.id }, "Fetching admin users list");

    try {
      const query = request.query as {
        page?: string;
        limit?: string;
      };

      const page = Math.max(1, parseInt(query.page || "1", 10));
      const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10)));

      // Get transaction counts and stats per user
      const userStats = await app.db
        .select({
          userId: schema.transactions.userId,
          transactionCount: countFn(schema.transactions.id),
          totalSpent: sum(schema.transactions.amount),
        })
        .from(schema.transactions)
        .groupBy(schema.transactions.userId);

      app.logger.info(
        { userCount: userStats.length },
        "Admin users list fetched"
      );

      return {
        users: userStats
          .slice((page - 1) * limit, page * limit)
          .map((stat) => ({
            userId: stat.userId,
            transactionCount: stat.transactionCount,
            totalSpent: stat.totalSpent
              ? parseFloat(stat.totalSpent as any)
              : 0,
          })),
        total: userStats.length,
        page,
        limit,
      };
    } catch (error) {
      app.logger.error(
        { err: error, userId: session.user.id },
        "Failed to fetch admin users list"
      );
      throw error;
    }
  });

  // GET /api/admin/dashboard - Get admin dashboard stats
  fastify.get("/api/admin/dashboard", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    // Note: In a full implementation, check for admin role
    app.logger.info({ userId: session.user.id }, "Fetching admin dashboard");

    try {
      // Get all transactions
      const allTransactions = await app.db
        .select()
        .from(schema.transactions);

      // Get transaction count
      const [{ value: totalTransactions }] = await app.db
        .select({ value: countFn(schema.transactions.id) })
        .from(schema.transactions);

      // Get unique user count
      const userCountResult = await app.db
        .selectDistinct({ userId: schema.transactions.userId })
        .from(schema.transactions);
      const uniqueUsers = userCountResult.length;

      // Fraud detected (HIGH and CRITICAL)
      const fraudDetected = allTransactions.filter(
        (t) => t.riskLevel === "HIGH" || t.riskLevel === "CRITICAL"
      ).length;

      // Money protected (sum of blocked/reported)
      const protectedTransactions = allTransactions.filter(
        (t) => t.isBlocked || t.isFraudReported
      );
      const moneyProtected = protectedTransactions.reduce(
        (sum, t) => sum + parseFloat(t.amount as any),
        0
      );

      // Real-time stats
      const now = new Date();
      const last24hAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const transactionsLast24h = allTransactions.filter(
        (t) => t.createdAt > last24hAgo
      );

      const fraudLast24h = transactionsLast24h.filter(
        (t) => t.riskLevel === "HIGH" || t.riskLevel === "CRITICAL"
      ).length;

      // Average risk score
      const avgRiskScore =
        allTransactions.length > 0
          ? allTransactions.reduce((sum, t) => sum + t.riskScore, 0) /
            allTransactions.length
          : 0;

      // Risk level distribution
      const riskDistribution = {
        LOW: allTransactions.filter((t) => t.riskLevel === "LOW").length,
        MEDIUM: allTransactions.filter((t) => t.riskLevel === "MEDIUM").length,
        HIGH: allTransactions.filter((t) => t.riskLevel === "HIGH").length,
        CRITICAL: allTransactions.filter((t) => t.riskLevel === "CRITICAL")
          .length,
      };

      app.logger.info(
        {
          totalUsers: uniqueUsers,
          totalTransactions,
          fraudDetected,
        },
        "Admin dashboard fetched"
      );

      return {
        totalUsers: uniqueUsers,
        totalTransactions,
        fraudDetected,
        moneyProtected: moneyProtected,
        realtimeStats: {
          transactionsLast24h: transactionsLast24h.length,
          fraudLast24h,
          averageRiskScore: Math.round(avgRiskScore * 100) / 100,
          riskDistribution,
        },
      };
    } catch (error) {
      app.logger.error(
        { err: error, userId: session.user.id },
        "Failed to fetch admin dashboard"
      );
      throw error;
    }
  });
}
