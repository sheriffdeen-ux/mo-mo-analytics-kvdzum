import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, and, desc, gte } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";

export function registerSecurityDashboardRoutes(
  app: App,
  fastify: FastifyInstance
) {
  const requireAuth = app.requireAuth();

  // GET /api/dashboard/security-overview
  fastify.get(
    "/api/dashboard/security-overview",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;

      app.logger.info({ userId }, "Fetching security dashboard overview");

      try {
        // Get user's transactions
        const transactions = await app.db
          .select()
          .from(schema.transactions)
          .where(eq(schema.transactions.userId, userId));

        // Get user's alerts
        const alerts = await app.db
          .select()
          .from(schema.inAppAlerts)
          .where(eq(schema.inAppAlerts.userId, userId));

        // Count fraud detected (HIGH/CRITICAL risk)
        const fraudDetected = transactions.filter(
          (t) => t.riskLevel === "HIGH" || t.riskLevel === "CRITICAL"
        ).length;

        // Calculate money protected (sum of fraud transaction amounts)
        const moneyProtected = transactions
          .filter((t) => t.riskLevel === "HIGH" || t.riskLevel === "CRITICAL")
          .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

        // Get layer performance (average passing rates)
        const securityLogs = await app.db
          .select()
          .from(schema.securityLayersLog)
          .where(eq(schema.securityLayersLog.userId, userId));

        const layerPerformance: Array<{
          layer: number;
          layerName: string;
          passRate: number;
          avgProcessingTime: number;
        }> = [];

        for (let i = 1; i <= 7; i++) {
          const layerLogs = securityLogs.filter((log) => log.layerNumber === i);
          if (layerLogs.length > 0) {
            const passCount = layerLogs.filter((log) => log.status === "PASS").length;
            const passRate = (passCount / layerLogs.length) * 100;
            const avgTime =
              layerLogs.reduce((sum, log) => sum + (log.processingTimeMs || 0), 0) /
              layerLogs.length;

            const layerNames = [
              "SMS Capture",
              "Input Validation",
              "Pattern Recognition",
              "Behavioral Analytics",
              "Risk Scoring",
              "Alert System",
              "Audit Trail",
            ];

            layerPerformance.push({
              layer: i,
              layerName: layerNames[i - 1],
              passRate: Math.round(passRate),
              avgProcessingTime: Math.round(avgTime),
            });
          }
        }

        // Get recent alerts
        const recentAlerts = alerts
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5)
          .map((alert) => ({
            id: alert.id,
            alertLevel: alert.alertLevel,
            title: alert.title,
            riskScore: alert.riskScore,
            createdAt: alert.createdAt,
          }));

        // Risk distribution
        const riskDistribution = {
          LOW: transactions.filter((t) => t.riskLevel === "LOW").length,
          MEDIUM: transactions.filter((t) => t.riskLevel === "MEDIUM").length,
          HIGH: transactions.filter((t) => t.riskLevel === "HIGH").length,
          CRITICAL: transactions.filter((t) => t.riskLevel === "CRITICAL").length,
        };

        app.logger.info(
          { userId, transactionCount: transactions.length, fraudCount: fraudDetected },
          "Security dashboard overview retrieved"
        );

        return {
          success: true,
          overview: {
            totalTransactions: transactions.length,
            fraudDetected,
            moneyProtected: moneyProtected.toFixed(2),
            alertsGenerated: alerts.length,
            unreadAlerts: alerts.filter((a) => !a.isRead).length,
            layerPerformance,
            recentAlerts,
            riskDistribution,
          },
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          "Failed to fetch security dashboard overview"
        );
        throw error;
      }
    }
  );
}
