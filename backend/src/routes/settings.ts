import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";

export function registerSettingsRoutes(app: App, fastify: FastifyInstance) {
  const requireAuth = app.requireAuth();

  // GET /api/settings - Get user settings
  fastify.get("/api/settings", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, "Fetching user settings");

    try {
      let settings = await app.db
        .select()
        .from(schema.userSettings)
        .where(eq(schema.userSettings.userId, session.user.id));

      if (settings.length === 0) {
        // Create default settings if doesn't exist
        const [created] = await app.db
          .insert(schema.userSettings)
          .values({
            userId: session.user.id,
            dailyLimit: "2000",
            blockedMerchants: [],
            trustedMerchants: [],
          })
          .returning();
        settings = [created];
      }

      const userSettings = settings[0];

      app.logger.info(
        { userId: session.user.id, dailyLimit: userSettings.dailyLimit },
        "Settings fetched successfully"
      );

      return {
        dailyLimit: parseFloat(userSettings.dailyLimit as any),
        blockedMerchants: userSettings.blockedMerchants || [],
        trustedMerchants: userSettings.trustedMerchants || [],
      };
    } catch (error) {
      app.logger.error(
        { err: error, userId: session.user.id },
        "Failed to fetch settings"
      );
      throw error;
    }
  });

  // PUT /api/settings - Update user settings
  fastify.put("/api/settings", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const body = request.body as {
      dailyLimit?: number;
      blockedMerchants?: string[];
      trustedMerchants?: string[];
    };

    app.logger.info(
      {
        userId: session.user.id,
        dailyLimit: body.dailyLimit,
      },
      "Updating user settings"
    );

    try {
      // Get existing settings
      let settings = await app.db
        .select()
        .from(schema.userSettings)
        .where(eq(schema.userSettings.userId, session.user.id));

      let userSettings;
      if (settings.length === 0) {
        // Create new settings
        const [created] = await app.db
          .insert(schema.userSettings)
          .values({
            userId: session.user.id,
            dailyLimit: String(body.dailyLimit || 2000),
            blockedMerchants: body.blockedMerchants || [],
            trustedMerchants: body.trustedMerchants || [],
          })
          .returning();
        userSettings = created;
      } else {
        // Update existing settings
        const updateData: Record<string, any> = {};
        if (body.dailyLimit !== undefined) {
          updateData.dailyLimit = String(body.dailyLimit);
        }
        if (body.blockedMerchants !== undefined) {
          updateData.blockedMerchants = body.blockedMerchants;
        }
        if (body.trustedMerchants !== undefined) {
          updateData.trustedMerchants = body.trustedMerchants;
        }

        const [updated] = await app.db
          .update(schema.userSettings)
          .set(updateData)
          .where(eq(schema.userSettings.userId, session.user.id))
          .returning();
        userSettings = updated;
      }

      app.logger.info(
        { userId: session.user.id, dailyLimit: userSettings.dailyLimit },
        "Settings updated successfully"
      );

      return {
        dailyLimit: parseFloat(userSettings.dailyLimit as any),
        blockedMerchants: userSettings.blockedMerchants || [],
        trustedMerchants: userSettings.trustedMerchants || [],
      };
    } catch (error) {
      app.logger.error(
        { err: error, userId: session.user.id },
        "Failed to update settings"
      );
      throw error;
    }
  });
}
