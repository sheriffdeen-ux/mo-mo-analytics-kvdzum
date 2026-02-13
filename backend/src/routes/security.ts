import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";
import { hashPIN, verifyPIN, validatePINFormat } from "../utils/pin-service.js";
import {
  generateDeviceFingerprint,
  extractDeviceFingerprintFromRequest,
  isDeviceFingerprintMatch,
} from "../utils/device-fingerprint.js";
import {
  logPINEvent,
  logDeviceTrustEvent,
  logSMSEvent,
  extractIPAddress,
} from "../utils/audit-log.js";

// Rate limiting for PIN verification attempts (5 per hour per user)
const pinAttempts = new Map<string, { count: number; resetTime: number }>();

function checkPINRateLimit(userId: string): boolean {
  const now = Date.now();
  const attempt = pinAttempts.get(userId);

  if (!attempt || now > attempt.resetTime) {
    pinAttempts.set(userId, { count: 1, resetTime: now + 3600000 }); // 1 hour
    return true;
  }

  if (attempt.count >= 5) {
    return false;
  }

  attempt.count++;
  return true;
}

export function registerSecurityRoutes(app: App, fastify: FastifyInstance) {
  const requireAuth = app.requireAuth();

  // POST /api/pin/set - Set or update PIN for device verification
  fastify.post(
    "/api/pin/set",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const body = request.body as { pin: string };

      app.logger.info({ userId: session.user.id }, "Setting PIN");

      try {
        // Validate PIN format
        if (!body.pin || !validatePINFormat(body.pin)) {
          return {
            success: false,
            error: "PIN must be 4-6 digits",
          };
        }

        // Get user
        const [user] = await app.db
          .select()
          .from(schema.userExtended)
          .where(eq(schema.userExtended.userId, session.user.id));

        if (!user) {
          return { success: false, error: "User not found" };
        }

        // Hash and update PIN
        const pinHash = hashPIN(body.pin);
        await app.db
          .update(schema.userExtended)
          .set({
            pin: pinHash,
            requiresPinOnNewDevice: true,
          })
          .where(eq(schema.userExtended.userId, session.user.id));

        await logPINEvent(app, session.user.id, "SET", true, request);

        app.logger.info({ userId: session.user.id }, "PIN set successfully");

        return {
          success: true,
          message: "PIN set successfully",
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          "Failed to set PIN"
        );
        await logPINEvent(app, session.user.id, "SET", false, request);
        throw error;
      }
    }
  );

  // POST /api/pin/verify - Verify PIN for new device access
  fastify.post(
    "/api/pin/verify",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const body = request.body as { pin: string };

      app.logger.info({ userId: session.user.id }, "Verifying PIN");

      try {
        // Check rate limit
        if (!checkPINRateLimit(session.user.id)) {
          app.logger.warn(
            { userId: session.user.id },
            "PIN verification rate limit exceeded"
          );
          return {
            success: false,
            error: "Too many PIN verification attempts. Try again in 1 hour.",
          };
        }

        // Get user
        const [user] = await app.db
          .select()
          .from(schema.userExtended)
          .where(eq(schema.userExtended.userId, session.user.id));

        if (!user || !user.pin) {
          return {
            success: false,
            error: "No PIN set for this account",
          };
        }

        // Verify PIN
        if (!verifyPIN(body.pin, user.pin)) {
          await logPINEvent(app, session.user.id, "VERIFY", false, request);
          return {
            success: false,
            error: "Invalid PIN",
          };
        }

        // Extract device fingerprint
        const deviceData = extractDeviceFingerprintFromRequest(request);
        const deviceFingerprint = generateDeviceFingerprint(deviceData);

        // Update last login device
        await app.db
          .update(schema.userExtended)
          .set({
            deviceFingerprint,
            lastLoginDevice: deviceData.deviceId,
            lastLoginAt: new Date(),
          })
          .where(eq(schema.userExtended.userId, session.user.id));

        // Update device trust log
        const [existingTrust] = await app.db
          .select()
          .from(schema.deviceTrustLog)
          .where(
            eq(
              schema.deviceTrustLog.deviceFingerprint,
              deviceFingerprint
            )
          );

        if (existingTrust) {
          await app.db
            .update(schema.deviceTrustLog)
            .set({
              trustLevel: "trusted",
              lastSeenAt: new Date(),
            })
            .where(
              eq(schema.deviceTrustLog.id, existingTrust.id)
            );
        }

        await logPINEvent(app, session.user.id, "VERIFY", true, request);

        app.logger.info(
          { userId: session.user.id, deviceId: deviceData.deviceId },
          "PIN verified successfully"
        );

        return {
          success: true,
          message: "Device verified and trusted",
          deviceFingerprint,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          "Failed to verify PIN"
        );
        throw error;
      }
    }
  );

  // POST /api/sms-consent - Update SMS consent preference
  fastify.post(
    "/api/sms-consent",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const body = request.body as { smsConsentGiven: boolean };

      app.logger.info(
        { userId: session.user.id, consent: body.smsConsentGiven },
        "Updating SMS consent"
      );

      try {
        // Update user settings
        await app.db
          .update(schema.userExtended)
          .set({
            smsConsentGiven: body.smsConsentGiven,
          })
          .where(eq(schema.userExtended.userId, session.user.id));

        // Also update settings table
        await app.db
          .update(schema.userSettings)
          .set({
            smsReadPreference: body.smsConsentGiven ? "momo_only" : "all",
          })
          .where(eq(schema.userSettings.userId, session.user.id));

        await logSMSEvent(
          app,
          session.user.id,
          "CONSENT_UPDATE",
          { consentGiven: body.smsConsentGiven },
          request
        );

        app.logger.info(
          { userId: session.user.id, consent: body.smsConsentGiven },
          "SMS consent updated"
        );

        return {
          success: true,
          smsConsentGiven: body.smsConsentGiven,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          "Failed to update SMS consent"
        );
        throw error;
      }
    }
  );

  // POST /api/sms-scan-report - Report SMS scan for transparency
  fastify.post(
    "/api/sms-scan-report",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const body = request.body as {
        smsCount: number;
        momoSmsCount: number;
      };

      app.logger.info(
        {
          userId: session.user.id,
          smsCount: body.smsCount,
          momoSmsCount: body.momoSmsCount,
        },
        "Logging SMS scan"
      );

      try {
        // Get user device fingerprint
        const [user] = await app.db
          .select()
          .from(schema.userExtended)
          .where(eq(schema.userExtended.userId, session.user.id));

        if (!user) {
          return { success: false, error: "User not found" };
        }

        const deviceData = extractDeviceFingerprintFromRequest(request);
        const deviceFingerprint = generateDeviceFingerprint(deviceData);

        // Log SMS scan
        await app.db.insert(schema.smsScanLog).values({
          userId: session.user.id,
          deviceFingerprint,
          smsCount: body.smsCount,
          momoSmsCount: body.momoSmsCount,
          scannedAt: new Date(),
        });

        await logSMSEvent(
          app,
          session.user.id,
          "SCAN_REPORT",
          {
            smsCount: body.smsCount,
            momoSmsCount: body.momoSmsCount,
            deviceId: deviceData.deviceId,
          },
          request
        );

        app.logger.info(
          {
            userId: session.user.id,
            momoSmsCount: body.momoSmsCount,
          },
          "SMS scan logged"
        );

        return {
          success: true,
          message: "SMS scan logged successfully",
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          "Failed to log SMS scan"
        );
        throw error;
      }
    }
  );

  // GET /api/device-trust-status - Get device trust information
  fastify.get(
    "/api/device-trust-status",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, "Fetching device trust status");

      try {
        // Get user
        const [user] = await app.db
          .select()
          .from(schema.userExtended)
          .where(eq(schema.userExtended.userId, session.user.id));

        if (!user) {
          return { success: false, error: "User not found" };
        }

        // Extract current device fingerprint
        const deviceData = extractDeviceFingerprintFromRequest(request);
        const currentDeviceFingerprint = generateDeviceFingerprint(deviceData);

        // Check if current device is trusted
        const [deviceTrust] = await app.db
          .select()
          .from(schema.deviceTrustLog)
          .where(
            eq(
              schema.deviceTrustLog.deviceFingerprint,
              currentDeviceFingerprint
            )
          );

        const isCurrentDeviceTrusted =
          deviceTrust?.trustLevel === "trusted" ? true : false;

        // Check if current device matches stored device
        const isCurrentDevice = user.deviceFingerprint
          ? isDeviceFingerprintMatch(
              user.deviceFingerprint,
              currentDeviceFingerprint
            )
          : false;

        return {
          success: true,
          deviceFingerprint: currentDeviceFingerprint,
          isCurrentDeviceTrusted,
          isCurrentDevice,
          lastLoginAt: user.lastLoginAt,
          requiresPinOnNewDevice: user.requiresPinOnNewDevice,
          pinSetup: user.pin ? true : false,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          "Failed to fetch device trust status"
        );
        throw error;
      }
    }
  );

  // GET /api/privacy/data-access-info - Get information about data access and retention
  fastify.get(
    "/api/privacy/data-access-info",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info(
        { userId: session.user.id },
        "Fetching privacy data access info"
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

        // Get audit log count
        const auditLogs = await app.db
          .select()
          .from(schema.auditLog)
          .where(eq(schema.auditLog.userId, session.user.id));

        // Get device trust logs
        const deviceLogs = await app.db
          .select()
          .from(schema.deviceTrustLog)
          .where(eq(schema.deviceTrustLog.userId, session.user.id));

        // Get SMS scan logs
        const smsLogs = await app.db
          .select()
          .from(schema.smsScanLog)
          .where(eq(schema.smsScanLog.userId, session.user.id));

        // Get transactions
        const transactions = await app.db
          .select()
          .from(schema.transactions)
          .where(eq(schema.transactions.userId, session.user.id));

        const now = new Date();

        return {
          success: true,
          dataCollection: {
            startDate: user.createdAt,
            currentDate: now,
            dataRetentionPeriod: "User subscription period + 30 days after cancellation",
          },
          dataCategories: {
            transactionRecords: {
              count: transactions.length,
              description:
                "Mobile Money transactions analyzed for fraud detection",
              retentionPolicy: "Retained for subscription period + 30 days",
            },
            auditLogs: {
              count: auditLogs.length,
              description: "Security events and user actions",
              retentionPolicy: "Retained for 1 year",
            },
            deviceLogs: {
              count: deviceLogs.length,
              description: "Device trust information and verification logs",
              retentionPolicy: "Retained for subscription period",
            },
            smsLogs: {
              count: smsLogs.length,
              description: "SMS scanning activity and MoMo transaction detection",
              retentionPolicy: "Retained for subscription period",
            },
          },
          userRights: {
            accessData: "You can request all your personal data",
            exportData: "You can export your transaction history as CSV",
            deleteAccount: "You can request deletion of your account and data",
            optOut: "You can disable notifications and data collection",
            rectification:
              "You can request correction of inaccurate data",
          },
          smsPolicy: {
            smsConsentGiven: user.smsConsentGiven,
            smsAutoDetectionEnabled: user.smsAutoDetectionEnabled,
            message: user.smsConsentGiven
              ? "You have provided consent for SMS-based fraud detection"
              : "You have not provided consent for SMS-based fraud detection",
          },
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          "Failed to fetch privacy data access info"
        );
        throw error;
      }
    }
  );
}
