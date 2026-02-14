import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";

export function registerSecurityLayersRoutes(
  app: App,
  fastify: FastifyInstance
) {
  // GET /api/security-layers/transaction/:transactionId
  fastify.get(
    "/api/security-layers/transaction/:transactionId",
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
      const { transactionId } = request.params as { transactionId: string };

      app.logger.info(
        { userId, transactionId },
        "Fetching security layer analysis"
      );

      try {
        // Verify user owns this transaction
        const [transaction] = await app.db
          .select()
          .from(schema.transactions)
          .where(eq(schema.transactions.id, transactionId as any));

        if (!transaction || transaction.userId !== userId) {
          return reply.status(403).send({
            success: false,
            error: "Access denied",
          });
        }

        // Get all security layer logs for this transaction
        const layers = await app.db
          .select()
          .from(schema.securityLayersLog)
          .where(eq(schema.securityLayersLog.transactionId, transactionId as any));

        const totalProcessingTime =
          layers.reduce((sum, layer) => sum + (layer.processingTimeMs || 0), 0);

        const overallStatus =
          layers.some((l) => l.status === "FAIL") ? "FAIL" : layers.some((l) => l.status === "WARNING") ? "WARNING" : "PASS";

        app.logger.info(
          { userId, transactionId, layerCount: layers.length },
          "Security layer analysis retrieved"
        );

        return {
          success: true,
          transactionId,
          layers: layers.map((layer) => ({
            layerNumber: layer.layerNumber,
            layerName: layer.layerName,
            status: layer.status,
            score: layer.score,
            details: layer.details,
            processingTimeMs: layer.processingTimeMs,
          })),
          totalProcessingTime,
          overallStatus,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId, transactionId },
          "Failed to fetch security layer analysis"
        );
        throw error;
      }
    }
  );
}
