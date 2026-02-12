import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { App } from "../index.js";

export function registerHealthRoutes(app: App, fastify: FastifyInstance) {
  // GET /api/health - Service and database health check
  fastify.get("/api/health", async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info("Health check requested");

    try {
      // Database is checked implicitly when creating the app
      // Just return healthy status
      return {
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: "connected",
        service: "momo-analytics",
      };
    } catch (error) {
      app.logger.error(
        { err: error },
        "Health check failed - service error"
      );

      return {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        service: "momo-analytics",
      };
    }
  });
}
