/**
 * Audit Log Service - Logs security events for compliance and debugging
 */

import type { FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";

export interface AuditLogEntry {
  userId?: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
  deviceFingerprint?: string;
}

/**
 * Extract IP address from request
 */
export function extractIPAddress(request: FastifyRequest): string {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return request.ip || "unknown";
}

/**
 * Log an audit event
 */
export async function logAuditEvent(
  app: App,
  entry: AuditLogEntry,
  request?: FastifyRequest
): Promise<void> {
  try {
    const ipAddress = request ? extractIPAddress(request) : entry.ipAddress;
    const deviceFingerprint =
      entry.deviceFingerprint ||
      (request ? request.headers["x-device-fingerprint"] : undefined);

    await app.db.insert(schema.auditLog).values({
      userId: entry.userId,
      action: entry.action,
      details: entry.details,
      ipAddress: ipAddress as string,
      deviceFingerprint: deviceFingerprint as string | undefined,
      createdAt: new Date(),
    });
  } catch (error) {
    app.logger.warn({ err: error }, "Failed to log audit event");
  }
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(
  app: App,
  userId: string,
  limit: number = 50
): Promise<typeof schema.auditLog.$inferSelect[]> {
  return await app.db
    .select()
    .from(schema.auditLog)
    .where(eq(schema.auditLog.userId, userId))
    .orderBy((t) => t.createdAt)
    .limit(limit);
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
  app: App,
  userId: string,
  action: string,
  success: boolean,
  request?: FastifyRequest
): Promise<void> {
  await logAuditEvent(
    app,
    {
      userId,
      action: `AUTH_${action}_${success ? "SUCCESS" : "FAILED"}`,
      details: {
        timestamp: new Date().toISOString(),
      },
    },
    request
  );
}

/**
 * Log PIN event
 */
export async function logPINEvent(
  app: App,
  userId: string,
  action: "SET" | "VERIFY",
  success: boolean,
  request?: FastifyRequest
): Promise<void> {
  await logAuditEvent(
    app,
    {
      userId,
      action: `PIN_${action}_${success ? "SUCCESS" : "FAILED"}`,
      details: {
        timestamp: new Date().toISOString(),
      },
    },
    request
  );
}

/**
 * Log device trust event
 */
export async function logDeviceTrustEvent(
  app: App,
  userId: string,
  deviceFingerprint: string,
  action: string,
  trustLevel: string,
  request?: FastifyRequest
): Promise<void> {
  await logAuditEvent(
    app,
    {
      userId,
      action: `DEVICE_${action}`,
      details: {
        deviceFingerprint,
        trustLevel,
        timestamp: new Date().toISOString(),
      },
      deviceFingerprint,
    },
    request
  );
}

/**
 * Log SMS event
 */
export async function logSMSEvent(
  app: App,
  userId: string,
  action: string,
  details?: Record<string, any>,
  request?: FastifyRequest
): Promise<void> {
  await logAuditEvent(
    app,
    {
      userId,
      action: `SMS_${action}`,
      details: {
        ...details,
        timestamp: new Date().toISOString(),
      },
    },
    request
  );
}
