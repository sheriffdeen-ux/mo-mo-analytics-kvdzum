import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";

export function registerUserSecurityProfileRoutes(
  app: App,
  fastify: FastifyInstance
) {
  // GET /api/user-behavior-profile
  fastify.get(
    "/api/user-behavior-profile",
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

      app.logger.info({ userId }, "Fetching user behavior profile");

      try {
        let [profile] = await app.db
          .select()
          .from(schema.userBehaviorProfile)
          .where(eq(schema.userBehaviorProfile.userId, userId));

        // Create default profile if not exists
        if (!profile) {
          [profile] = await app.db
            .insert(schema.userBehaviorProfile)
            .values({
              userId,
              anomalyThreshold: 3 as any,
            })
            .returning();
        }

        app.logger.info({ userId }, "User behavior profile retrieved");

        return {
          success: true,
          profile: {
            userId: profile.userId,
            avgTransactionAmount: profile.avgTransactionAmount,
            typicalTransactionTimes: profile.typicalTransactionTimes,
            typicalRecipients: profile.typicalRecipients,
            transactionFrequency: profile.transactionFrequency,
            last30DaysPattern: profile.last30DaysPattern,
            anomalyThreshold: profile.anomalyThreshold,
          },
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          "Failed to fetch user behavior profile"
        );
        throw error;
      }
    }
  );

  // GET /api/recipient-blacklist
  fastify.get(
    "/api/recipient-blacklist",
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

      app.logger.info({ userId }, "Fetching recipient blacklist");

      try {
        const blacklist = await app.db
          .select()
          .from(schema.recipientBlacklist)
          .where(
            eq(schema.recipientBlacklist.userId, userId)
          );

        app.logger.info(
          { userId, count: blacklist.length },
          "Recipient blacklist retrieved"
        );

        return {
          success: true,
          blacklist: blacklist.map((entry) => ({
            id: entry.id,
            recipientIdentifier: entry.recipientIdentifier,
            blacklistType: entry.blacklistType,
            reason: entry.reason,
            riskLevel: entry.riskLevel,
            reportedCount: entry.reportedCount,
            createdAt: entry.createdAt,
          })),
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          "Failed to fetch recipient blacklist"
        );
        throw error;
      }
    }
  );

  // POST /api/recipient-blacklist
  fastify.post(
    "/api/recipient-blacklist",
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
        recipientIdentifier: string;
        reason?: string;
      };

      if (!body.recipientIdentifier) {
        return {
          success: false,
          error: "recipientIdentifier is required",
        };
      }

      app.logger.info(
        { userId, recipientIdentifier: body.recipientIdentifier },
        "Adding recipient to blacklist"
      );

      try {
        const [entry] = await app.db
          .insert(schema.recipientBlacklist)
          .values({
            recipientIdentifier: body.recipientIdentifier,
            blacklistType: "USER_SPECIFIC",
            userId,
            reason: body.reason,
            riskLevel: "HIGH",
          })
          .returning();

        app.logger.info(
          { userId, blacklistId: entry.id },
          "Recipient added to blacklist"
        );

        return {
          success: true,
          blacklistEntry: {
            id: entry.id,
            recipientIdentifier: entry.recipientIdentifier,
            blacklistType: entry.blacklistType,
            reason: entry.reason,
            riskLevel: entry.riskLevel,
          },
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId, recipientIdentifier: body.recipientIdentifier },
          "Failed to add recipient to blacklist"
        );
        throw error;
      }
    }
  );

  // DELETE /api/recipient-blacklist/:id
  fastify.delete(
    "/api/recipient-blacklist/:id",
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
      const { id } = request.params as { id: string };

      app.logger.info(
        { userId, blacklistId: id },
        "Removing recipient from blacklist"
      );

      try {
        // Verify user owns this entry
        const [entry] = await app.db
          .select()
          .from(schema.recipientBlacklist)
          .where(eq(schema.recipientBlacklist.id, id as any));

        if (!entry || entry.blacklistType !== "USER_SPECIFIC" || entry.userId !== userId) {
          return reply.status(403).send({
            success: false,
            error: "Access denied",
          });
        }

        await app.db
          .delete(schema.recipientBlacklist)
          .where(eq(schema.recipientBlacklist.id, id as any));

        app.logger.info(
          { userId, blacklistId: id },
          "Recipient removed from blacklist"
        );

        return { success: true };
      } catch (error) {
        app.logger.error(
          { err: error, userId, blacklistId: id },
          "Failed to remove recipient from blacklist"
        );
        throw error;
      }
    }
  );
}
