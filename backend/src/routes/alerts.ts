import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";

export function registerAlertRoutes(app: App, fastify: FastifyInstance) {
  const requireAuth = app.requireAuth();

  // POST /api/transactions/:id/confirm-safe - Confirm transaction is safe
  fastify.post(
    "/api/transactions/:id/confirm-safe",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };

      app.logger.info(
        { userId: session.user.id, transactionId: id },
        "Confirming transaction as safe"
      );

      try {
        // Get transaction
        const [transaction] = await app.db
          .select()
          .from(schema.transactions)
          .where(eq(schema.transactions.id, id));

        if (!transaction) {
          return { success: false, error: "Transaction not found" };
        }

        // Check ownership
        if (transaction.userId !== session.user.id) {
          app.logger.warn(
            { userId: session.user.id, transactionId: id },
            "Unauthorized access attempt"
          );
          return { success: false, error: "Unauthorized" };
        }

        // Get user
        const [user] = await app.db
          .select()
          .from(schema.userExtended)
          .where(eq(schema.userExtended.userId, session.user.id));

        if (!user) {
          return { success: false, error: "User not found" };
        }

        // Increment safe count
        const newSafeCount = user.confirmedSafeCount + 1;
        let newSensitivity = parseFloat(user.alertSensitivity as any);

        // Decrease sensitivity every 10 safe confirmations
        if (newSafeCount % 10 === 0) {
          newSensitivity = Math.max(0.7, newSensitivity - 0.05);
        }

        // Update user
        await app.db
          .update(schema.userExtended)
          .set({
            confirmedSafeCount: newSafeCount,
            alertSensitivity: String(newSensitivity),
          })
          .where(eq(schema.userExtended.userId, session.user.id));

        app.logger.info(
          {
            userId: session.user.id,
            newSensitivity,
            safeCount: newSafeCount,
          },
          "Transaction marked as safe"
        );

        return {
          success: true,
          newSensitivity,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, transactionId: id },
          "Failed to confirm safe transaction"
        );
        throw error;
      }
    }
  );
}
