import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";

export function registerInAppAlertsRoutes(
  app: App,
  fastify: FastifyInstance
) {
  // GET /api/alerts/in-app
  fastify.get(
    "/api/alerts/in-app",
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

      const query = request.query as {
        page?: string;
        limit?: string;
        level?: string;
        unreadOnly?: string;
      };

      const page = parseInt(query.page || "1");
      const limit = parseInt(query.limit || "20");
      const level = query.level;
      const unreadOnly = query.unreadOnly === "true";

      app.logger.info(
        { userId, page, limit, level, unreadOnly },
        "Fetching in-app alerts"
      );

      try {
        const conditions: any[] = [eq(schema.inAppAlerts.userId, userId)];

        if (level && ["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(level)) {
          conditions.push(eq(schema.inAppAlerts.alertLevel, level as any));
        }

        if (unreadOnly) {
          conditions.push(eq(schema.inAppAlerts.isRead, false));
        }

        // Get total count
        const allAlerts = await app.db
          .select()
          .from(schema.inAppAlerts)
          .where(and(...conditions));

        const total = allAlerts.length;

        // Get paginated alerts
        const offset = (page - 1) * limit;
        const alerts = await app.db
          .select()
          .from(schema.inAppAlerts)
          .where(and(...conditions))
          .orderBy(desc(schema.inAppAlerts.createdAt))
          .limit(limit)
          .offset(offset);

        // Count unread
        const unreadCount = allAlerts.filter(
          (alert) => !alert.isRead
        ).length;

        app.logger.info(
          { userId, alertCount: alerts.length, unreadCount },
          "In-app alerts retrieved"
        );

        return {
          success: true,
          alerts: alerts.map((alert) => ({
            id: alert.id,
            transactionId: alert.transactionId,
            alertLevel: alert.alertLevel,
            title: alert.title,
            message: alert.message,
            riskScore: alert.riskScore,
            riskReasons: alert.riskReasons,
            isRead: alert.isRead,
            isDismissed: alert.isDismissed,
            actionTaken: alert.actionTaken,
            createdAt: alert.createdAt,
          })),
          total,
          unreadCount,
          page,
          limit,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          "Failed to fetch in-app alerts"
        );
        throw error;
      }
    }
  );

  // PUT /api/alerts/in-app/:alertId/read
  fastify.put(
    "/api/alerts/in-app/:alertId/read",
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
      const { alertId } = request.params as { alertId: string };

      app.logger.info({ userId, alertId }, "Marking alert as read");

      try {
        // Verify user owns this alert
        const [alert] = await app.db
          .select()
          .from(schema.inAppAlerts)
          .where(eq(schema.inAppAlerts.id, alertId as any));

        if (!alert || alert.userId !== userId) {
          return reply.status(403).send({
            success: false,
            error: "Access denied",
          });
        }

        const [updatedAlert] = await app.db
          .update(schema.inAppAlerts)
          .set({
            isRead: true,
            readAt: new Date(),
          })
          .where(eq(schema.inAppAlerts.id, alertId as any))
          .returning();

        app.logger.info({ userId, alertId }, "Alert marked as read");

        return {
          success: true,
          alert: {
            id: updatedAlert.id,
            isRead: updatedAlert.isRead,
            readAt: updatedAlert.readAt,
          },
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId, alertId },
          "Failed to mark alert as read"
        );
        throw error;
      }
    }
  );

  // PUT /api/alerts/in-app/:alertId/dismiss
  fastify.put(
    "/api/alerts/in-app/:alertId/dismiss",
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
      const { alertId } = request.params as { alertId: string };

      app.logger.info({ userId, alertId }, "Dismissing alert");

      try {
        // Verify user owns this alert
        const [alert] = await app.db
          .select()
          .from(schema.inAppAlerts)
          .where(eq(schema.inAppAlerts.id, alertId as any));

        if (!alert || alert.userId !== userId) {
          return reply.status(403).send({
            success: false,
            error: "Access denied",
          });
        }

        await app.db
          .update(schema.inAppAlerts)
          .set({
            isDismissed: true,
          })
          .where(eq(schema.inAppAlerts.id, alertId as any));

        app.logger.info({ userId, alertId }, "Alert dismissed");

        return { success: true };
      } catch (error) {
        app.logger.error(
          { err: error, userId, alertId },
          "Failed to dismiss alert"
        );
        throw error;
      }
    }
  );

  // POST /api/alerts/in-app/:alertId/action
  fastify.post(
    "/api/alerts/in-app/:alertId/action",
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
      const { alertId } = request.params as { alertId: string };

      const body = request.body as {
        action: "CONFIRMED_SAFE" | "BLOCKED" | "REPORTED";
      };

      if (!body.action) {
        return {
          success: false,
          error: "action is required",
        };
      }

      app.logger.info({ userId, alertId, action: body.action }, "Recording alert action");

      try {
        // Verify user owns this alert
        const [alert] = await app.db
          .select()
          .from(schema.inAppAlerts)
          .where(eq(schema.inAppAlerts.id, alertId as any));

        if (!alert || alert.userId !== userId) {
          return reply.status(403).send({
            success: false,
            error: "Access denied",
          });
        }

        const [updatedAlert] = await app.db
          .update(schema.inAppAlerts)
          .set({
            actionTaken: body.action,
          })
          .where(eq(schema.inAppAlerts.id, alertId as any))
          .returning();

        app.logger.info(
          { userId, alertId, actionTaken: body.action },
          "Alert action recorded"
        );

        return {
          success: true,
          updatedAlert: {
            id: updatedAlert.id,
            actionTaken: updatedAlert.actionTaken,
          },
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId, alertId },
          "Failed to record alert action"
        );
        throw error;
      }
    }
  );
}
