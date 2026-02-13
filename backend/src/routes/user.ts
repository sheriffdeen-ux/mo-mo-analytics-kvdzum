import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";

export function registerUserRoutes(app: App, fastify: FastifyInstance) {
  const requireAuth = app.requireAuth();

  // GET /api/user/me - Get current authenticated user's info
  fastify.get("/api/user/me", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, "Fetching user profile");

    try {
      // Get user from userExtended table
      const [user] = await app.db
        .select()
        .from(schema.userExtended)
        .where(eq(schema.userExtended.userId, session.user.id));

      if (!user) {
        app.logger.warn({ userId: session.user.id }, "User not found");
        return reply.status(404).send({
          success: false,
          error: "User not found",
        });
      }

      // Check if trial expired and downgrade if needed
      let subscriptionStatus = user.subscriptionStatus;
      if (
        subscriptionStatus === "trial" &&
        user.trialEndDate &&
        new Date() > user.trialEndDate
      ) {
        // Downgrade to free
        await app.db
          .update(schema.userExtended)
          .set({ subscriptionStatus: "free" })
          .where(eq(schema.userExtended.userId, session.user.id));
        subscriptionStatus = "free";
      }

      app.logger.info({ userId: session.user.id }, "User profile fetched");

      return {
        success: true,
        user: {
          id: user.userId,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          email: user.phoneNumber, // Phone is used as email identifier
          subscriptionStatus,
          trialEndDate: user.trialEndDate,
          currentPlanId: user.currentPlanId,
        },
      };
    } catch (error) {
      app.logger.error(
        { err: error, userId: session.user.id },
        "Failed to fetch user profile"
      );
      throw error;
    }
  });

  // GET /api/user/profile - Alias for /me
  fastify.get("/api/user/profile", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, "Fetching user profile");

    try {
      const [user] = await app.db
        .select()
        .from(schema.userExtended)
        .where(eq(schema.userExtended.userId, session.user.id));

      if (!user) {
        app.logger.warn({ userId: session.user.id }, "User not found");
        return reply.status(404).send({
          success: false,
          error: "User not found",
        });
      }

      // Check if trial expired
      let subscriptionStatus = user.subscriptionStatus;
      if (
        subscriptionStatus === "trial" &&
        user.trialEndDate &&
        new Date() > user.trialEndDate
      ) {
        await app.db
          .update(schema.userExtended)
          .set({ subscriptionStatus: "free" })
          .where(eq(schema.userExtended.userId, session.user.id));
        subscriptionStatus = "free";
      }

      app.logger.info({ userId: session.user.id }, "User profile fetched");

      return {
        id: user.userId,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        email: user.phoneNumber,
        subscriptionStatus,
        trialEndDate: user.trialEndDate,
        currentPlanId: user.currentPlanId,
      };
    } catch (error) {
      app.logger.error(
        { err: error, userId: session.user.id },
        "Failed to fetch user profile"
      );
      throw error;
    }
  });
}
