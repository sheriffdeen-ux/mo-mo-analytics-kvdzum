import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";
import { requireAdmin } from "../utils/admin-auth.js";

export function registerRiskPatternsRoutes(
  app: App,
  fastify: FastifyInstance
) {
  const requireAuth = app.requireAuth();

  // GET /api/risk-patterns
  fastify.get(
    "/api/risk-patterns",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({}, "Fetching risk patterns");

      try {
        const patterns = await app.db
          .select()
          .from(schema.riskPatterns)
          .where(eq(schema.riskPatterns.isActive, true));

        app.logger.info({ count: patterns.length }, "Risk patterns retrieved");

        return {
          success: true,
          patterns: patterns.map((pattern) => ({
            id: pattern.id,
            patternType: pattern.patternType,
            patternValue: pattern.patternValue,
            riskWeight: pattern.riskWeight,
            isActive: pattern.isActive,
          })),
        };
      } catch (error) {
        app.logger.error({ err: error }, "Failed to fetch risk patterns");
        throw error;
      }
    }
  );

  // POST /api/risk-patterns (Admin endpoint)
  fastify.post(
    "/api/risk-patterns",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAdmin(app, request, reply);
      if (!session) return;

      const body = request.body as {
        patternType:
          | "SCAM_KEYWORD"
          | "TIME_PATTERN"
          | "AMOUNT_PATTERN"
          | "VELOCITY"
          | "LOCATION";
        patternValue: string;
        riskWeight: number;
      };

      if (!body.patternType || !body.patternValue || !body.riskWeight) {
        return {
          success: false,
          error: "patternType, patternValue, and riskWeight are required",
        };
      }

      app.logger.info(
        { patternType: body.patternType, patternValue: body.patternValue },
        "Adding new risk pattern"
      );

      try {
        const [pattern] = await app.db
          .insert(schema.riskPatterns)
          .values({
            patternType: body.patternType,
            patternValue: body.patternValue,
            riskWeight: body.riskWeight as any,
            isActive: true,
          })
          .returning();

        app.logger.info({ patternId: pattern.id }, "Risk pattern added");

        return {
          success: true,
          pattern: {
            id: pattern.id,
            patternType: pattern.patternType,
            patternValue: pattern.patternValue,
            riskWeight: pattern.riskWeight,
            isActive: pattern.isActive,
          },
        };
      } catch (error) {
        app.logger.error(
          { err: error, patternType: body.patternType },
          "Failed to add risk pattern"
        );
        throw error;
      }
    }
  );
}
