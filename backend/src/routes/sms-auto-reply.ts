import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";

export function registerSmsAutoReplyRoutes(
  app: App,
  fastify: FastifyInstance
) {
  const requireAuth = app.requireAuth();

  // GET /api/sms/auto-reply-settings - Get user's auto-reply settings
  fastify.get(
    "/api/sms/auto-reply-settings",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;

      app.logger.info({ userId }, "Fetching auto-reply settings");

      try {
        // Get or create default settings
        let [settings] = await app.db
          .select()
          .from(schema.smsAutoReplySettings)
          .where(eq(schema.smsAutoReplySettings.userId, userId));

        // If no settings exist, create defaults
        if (!settings) {
          const [newSettings] = await app.db
            .insert(schema.smsAutoReplySettings)
            .values({
              userId,
              autoReplyEnabled: true,
              replyOnlyNoFraud: true,
              includeDailySummary: true,
              includeWeeklySummary: false,
              includeMonthlySummary: false,
            })
            .returning();

          settings = newSettings;
        }

        app.logger.info({ userId }, "Auto-reply settings retrieved");

        return {
          success: true,
          settings: {
            autoReplyEnabled: settings.autoReplyEnabled,
            replyOnlyNoFraud: settings.replyOnlyNoFraud,
            includeDailySummary: settings.includeDailySummary,
            includeWeeklySummary: settings.includeWeeklySummary,
            includeMonthlySummary: settings.includeMonthlySummary,
            customReplyTemplate: settings.customReplyTemplate,
          },
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          "Failed to fetch auto-reply settings"
        );
        throw error;
      }
    }
  );

  // PUT /api/sms/auto-reply-settings - Update user's auto-reply settings
  fastify.put(
    "/api/sms/auto-reply-settings",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;

      const body = request.body as {
        autoReplyEnabled?: boolean;
        replyOnlyNoFraud?: boolean;
        includeDailySummary?: boolean;
        includeWeeklySummary?: boolean;
        includeMonthlySummary?: boolean;
        customReplyTemplate?: string;
      };

      app.logger.info(
        { userId, updates: Object.keys(body) },
        "Updating auto-reply settings"
      );

      try {
        // Get or create settings if they don't exist
        let [settings] = await app.db
          .select()
          .from(schema.smsAutoReplySettings)
          .where(eq(schema.smsAutoReplySettings.userId, userId));

        if (!settings) {
          const [newSettings] = await app.db
            .insert(schema.smsAutoReplySettings)
            .values({
              userId,
              autoReplyEnabled: body.autoReplyEnabled ?? true,
              replyOnlyNoFraud: body.replyOnlyNoFraud ?? true,
              includeDailySummary: body.includeDailySummary ?? true,
              includeWeeklySummary: body.includeWeeklySummary ?? false,
              includeMonthlySummary: body.includeMonthlySummary ?? false,
              customReplyTemplate: body.customReplyTemplate,
            })
            .returning();

          settings = newSettings;
        } else {
          // Update existing settings
          const updates: Record<string, any> = {};

          if (body.autoReplyEnabled !== undefined) {
            updates.autoReplyEnabled = body.autoReplyEnabled;
          }
          if (body.replyOnlyNoFraud !== undefined) {
            updates.replyOnlyNoFraud = body.replyOnlyNoFraud;
          }
          if (body.includeDailySummary !== undefined) {
            updates.includeDailySummary = body.includeDailySummary;
          }
          if (body.includeWeeklySummary !== undefined) {
            updates.includeWeeklySummary = body.includeWeeklySummary;
          }
          if (body.includeMonthlySummary !== undefined) {
            updates.includeMonthlySummary = body.includeMonthlySummary;
          }
          if (body.customReplyTemplate !== undefined) {
            updates.customReplyTemplate = body.customReplyTemplate;
          }

          const [updatedSettings] = await app.db
            .update(schema.smsAutoReplySettings)
            .set(updates)
            .where(eq(schema.smsAutoReplySettings.userId, userId))
            .returning();

          settings = updatedSettings;
        }

        app.logger.info(
          { userId, settings: Object.keys(body) },
          "Auto-reply settings updated successfully"
        );

        return {
          success: true,
          settings: {
            autoReplyEnabled: settings.autoReplyEnabled,
            replyOnlyNoFraud: settings.replyOnlyNoFraud,
            includeDailySummary: settings.includeDailySummary,
            includeWeeklySummary: settings.includeWeeklySummary,
            includeMonthlySummary: settings.includeMonthlySummary,
            customReplyTemplate: settings.customReplyTemplate,
          },
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          "Failed to update auto-reply settings"
        );
        throw error;
      }
    }
  );
}
