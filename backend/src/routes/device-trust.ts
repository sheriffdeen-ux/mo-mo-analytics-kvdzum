import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, and } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";
import {
  generateDeviceFingerprint,
  extractDeviceFingerprintFromRequest,
} from "../utils/device-fingerprint.js";
import { logDeviceTrustEvent } from "../utils/audit-log.js";

export function registerDeviceTrustRoutes(app: App, fastify: FastifyInstance) {
  const requireAuth = app.requireAuth();

  // POST /api/verify-phone-behavioral - Verify device using behavioral phone patterns
  fastify.post(
    "/api/verify-phone-behavioral",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const body = request.body as {
        smsPatternScore?: number;
        description?: string;
      };

      app.logger.info(
        { userId: session.user.id },
        "Verifying device using behavioral phone patterns"
      );

      try {
        // Get user
        const [user] = await app.db
          .select()
          .from(schema.userExtended)
          .where(eq(schema.userExtended.userId, session.user.id));

        if (!user) {
          return { success: false, error: "User not found" };
        }

        // Extract device fingerprint
        const deviceData = extractDeviceFingerprintFromRequest(request);
        const deviceFingerprint = generateDeviceFingerprint(deviceData);

        // Get or create device trust log entry
        const [existingTrust] = await app.db
          .select()
          .from(schema.deviceTrustLog)
          .where(
            and(
              eq(schema.deviceTrustLog.userId, session.user.id),
              eq(
                schema.deviceTrustLog.deviceFingerprint,
                deviceFingerprint
              )
            )
          );

        // Calculate trust level based on SMS pattern score and transaction history
        let trustLevel: "trusted" | "suspicious" | "blocked" = "trusted";
        let score = 50; // Base score

        // Check SMS pattern score if provided
        if (body.smsPatternScore) {
          score = Math.min(100, Math.max(0, body.smsPatternScore));
          if (score < 30) {
            trustLevel = "blocked";
          } else if (score < 70) {
            trustLevel = "suspicious";
          }
        }

        if (existingTrust) {
          // Update existing trust log
          await app.db
            .update(schema.deviceTrustLog)
            .set({
              trustLevel,
              lastSeenAt: new Date(),
              transactionPatternScore: String(score),
            })
            .where(eq(schema.deviceTrustLog.id, existingTrust.id));
        } else {
          // Create new trust log entry
          await app.db.insert(schema.deviceTrustLog).values({
            userId: session.user.id,
            deviceFingerprint,
            trustLevel,
            firstSeenAt: new Date(),
            lastSeenAt: new Date(),
            loginAttempts: 1,
            smsVerificationCount: 0,
            transactionPatternScore: String(score),
          });
        }

        await logDeviceTrustEvent(
          app,
          session.user.id,
          deviceFingerprint,
          "BEHAVIORAL_VERIFY",
          trustLevel,
          request
        );

        app.logger.info(
          {
            userId: session.user.id,
            deviceId: deviceData.deviceId,
            trustLevel,
            score,
          },
          "Device verified using behavioral patterns"
        );

        return {
          success: true,
          trustLevel,
          score,
          message: `Device trust level: ${trustLevel}`,
          recommendation:
            trustLevel === "trusted"
              ? "Device is trusted, no additional verification needed"
              : trustLevel === "suspicious"
                ? "Device appears suspicious, SMS verification recommended"
                : "Device is blocked, contact support",
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          "Failed to verify device using behavioral patterns"
        );
        throw error;
      }
    }
  );

  // GET /api/trusted-devices - Get list of trusted devices
  fastify.get(
    "/api/trusted-devices",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, "Fetching trusted devices");

      try {
        // Get all device trust entries for user
        const devices = await app.db
          .select()
          .from(schema.deviceTrustLog)
          .where(eq(schema.deviceTrustLog.userId, session.user.id));

        const deviceList = devices.map((device) => ({
          deviceFingerprint: device.deviceFingerprint,
          trustLevel: device.trustLevel,
          firstSeenAt: device.firstSeenAt,
          lastSeenAt: device.lastSeenAt,
          loginAttempts: device.loginAttempts,
          transactionPatternScore: parseFloat(device.transactionPatternScore as any),
        }));

        return {
          success: true,
          trustedDevices: deviceList,
          count: deviceList.length,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          "Failed to fetch trusted devices"
        );
        throw error;
      }
    }
  );

  // POST /api/untrust-device - Remove device from trusted list
  fastify.post(
    "/api/untrust-device",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const body = request.body as { deviceFingerprint: string };

      app.logger.info(
        { userId: session.user.id, deviceFingerprint: body.deviceFingerprint },
        "Untrusing device"
      );

      try {
        // Get device trust entry
        const [device] = await app.db
          .select()
          .from(schema.deviceTrustLog)
          .where(
            and(
              eq(schema.deviceTrustLog.userId, session.user.id),
              eq(
                schema.deviceTrustLog.deviceFingerprint,
                body.deviceFingerprint
              )
            )
          );

        if (!device) {
          return { success: false, error: "Device not found" };
        }

        // Update device to suspicious
        await app.db
          .update(schema.deviceTrustLog)
          .set({ trustLevel: "suspicious" })
          .where(eq(schema.deviceTrustLog.id, device.id));

        await logDeviceTrustEvent(
          app,
          session.user.id,
          body.deviceFingerprint,
          "DEVICE_UNTRUST",
          "suspicious",
          request
        );

        app.logger.info(
          { userId: session.user.id, deviceFingerprint: body.deviceFingerprint },
          "Device untrused"
        );

        return {
          success: true,
          message: "Device removed from trusted list",
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          "Failed to untrust device"
        );
        throw error;
      }
    }
  );

  // GET /api/security-audit-log - Get security audit log for user
  fastify.get(
    "/api/security-audit-log",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const limit = (request.query as any).limit || 50;

      app.logger.info(
        { userId: session.user.id, limit },
        "Fetching security audit log"
      );

      try {
        // Get audit logs
        const logs = await app.db
          .select()
          .from(schema.auditLog)
          .where(eq(schema.auditLog.userId, session.user.id))
          .orderBy((t) => t.createdAt)
          .limit(parseInt(limit, 10));

        const auditEntries = logs.map((log) => ({
          id: log.id,
          action: log.action,
          details: log.details,
          ipAddress: log.ipAddress,
          deviceFingerprint: log.deviceFingerprint,
          createdAt: log.createdAt,
        }));

        return {
          success: true,
          auditLog: auditEntries,
          count: auditEntries.length,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          "Failed to fetch audit log"
        );
        throw error;
      }
    }
  );
}
