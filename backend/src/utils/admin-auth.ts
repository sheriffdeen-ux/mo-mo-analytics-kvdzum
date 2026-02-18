import { eq } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";
import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Require admin role for a route
 * Returns the session if the user is an admin, otherwise sends 403 and returns null
 */
export async function requireAdmin(app: App, request: FastifyRequest, reply: FastifyReply) {
  const requireAuth = app.requireAuth();
  const session = await requireAuth(request, reply);
  if (!session) return null;

  try {
    const [user] = await app.db
      .select()
      .from(schema.userExtended)
      .where(eq(schema.userExtended.userId, session.user.id));

    if (!user || user.role !== "admin") {
      app.logger.warn({ userId: session.user.id }, "Unauthorized admin access attempt");
      reply.status(403).send({
        success: false,
        error: "Forbidden: Admin access required",
      });
      return null;
    }

    return session;
  } catch (error) {
    app.logger.error({ err: error, userId: session.user.id }, "Error checking admin role");
    reply.status(500).send({
      success: false,
      error: "Internal server error",
    });
    return null;
  }
}
