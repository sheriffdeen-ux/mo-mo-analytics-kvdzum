import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, and, gt, lte } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";
import {
  generateOTPCode,
  hashOTPCode,
  verifyOTPCode,
  validateGhanaPhoneNumber,
  normalizePhoneNumber,
} from "../utils/otp-service.js";
import { sendOTPViaSMS } from "../utils/arkesel-sms.js";

// In-memory rate limiting (for production, use Redis)
const otpRateLimiter = new Map<
  string,
  { count: number; resetTime: number }
>();

/**
 * Check OTP rate limit (3 per hour per phone)
 */
function checkOTPRateLimit(phoneNumber: string): boolean {
  const now = Date.now();
  const limit = otpRateLimiter.get(phoneNumber);

  if (!limit || now > limit.resetTime) {
    otpRateLimiter.set(phoneNumber, {
      count: 1,
      resetTime: now + 60 * 60 * 1000, // 1 hour
    });
    return true;
  }

  if (limit.count < 3) {
    limit.count++;
    return true;
  }

  return false;
}

export function registerAuthRoutes(app: App, fastify: FastifyInstance) {
  // POST /api/phone/send-otp - Send OTP to Ghana phone number
  fastify.post("/api/phone/send-otp", async (request: FastifyRequest) => {
    const body = request.body as { phoneNumber: string };

    app.logger.info({ phoneNumber: body.phoneNumber }, "Sending OTP");

    try {
      // Validate phone number
      if (!validateGhanaPhoneNumber(body.phoneNumber)) {
        return {
          success: false,
          error: "Invalid Ghana phone number format. Use +233XXXXXXXXX",
        };
      }

      const normalizedPhone = normalizePhoneNumber(body.phoneNumber);

      // Check rate limit
      if (!checkOTPRateLimit(normalizedPhone)) {
        return {
          success: false,
          error: "Too many OTP requests. Please try again in 1 hour.",
        };
      }

      // Generate OTP
      const otpCode = generateOTPCode();
      const hashedOTP = hashOTPCode(otpCode);

      // Calculate expiry (10 minutes)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Store OTP in database
      await app.db
        .insert(schema.otpVerifications)
        .values({
          phoneNumber: normalizedPhone,
          otpCode: hashedOTP,
          expiresAt,
          verified: false,
          attempts: 0,
        });

      // Send OTP via SMS
      const smsResult = await sendOTPViaSMS(normalizedPhone, otpCode);

      if (!smsResult.success) {
        app.logger.error(
          { phoneNumber: normalizedPhone, error: smsResult.error },
          "Failed to send OTP SMS"
        );
        return {
          success: false,
          error: "Failed to send OTP. Please try again.",
        };
      }

      app.logger.info({ phoneNumber: normalizedPhone }, "OTP sent successfully");

      return {
        success: true,
        expiresIn: 600, // 10 minutes in seconds
      };
    } catch (error) {
      app.logger.error(
        { err: error, phoneNumber: body.phoneNumber },
        "Failed to send OTP"
      );
      throw error;
    }
  });

  // POST /api/phone/verify-otp - Verify OTP and create/login user
  fastify.post("/api/phone/verify-otp", async (request: FastifyRequest) => {
    const body = request.body as {
      phoneNumber: string;
      otpCode: string;
      fullName?: string;
      deviceId: string;
    };

    app.logger.info({ phoneNumber: body.phoneNumber }, "Verifying OTP");

    try {
      // Validate inputs
      if (!validateGhanaPhoneNumber(body.phoneNumber)) {
        return { success: false, error: "Invalid phone number format" };
      }

      if (!/^\d{6}$/.test(body.otpCode)) {
        return { success: false, error: "OTP must be 6 digits" };
      }

      const normalizedPhone = normalizePhoneNumber(body.phoneNumber);

      // Find OTP record
      const [otpRecord] = await app.db
        .select()
        .from(schema.otpVerifications)
        .where(eq(schema.otpVerifications.phoneNumber, normalizedPhone))
        .orderBy(schema.otpVerifications.createdAt)
        .limit(1);

      if (!otpRecord) {
        return { success: false, error: "OTP not found or expired" };
      }

      // Check expiry
      if (new Date() > otpRecord.expiresAt) {
        return { success: false, error: "OTP has expired" };
      }

      // Check attempts
      if (otpRecord.attempts >= 3) {
        return {
          success: false,
          error: "Maximum OTP attempts exceeded. Request a new OTP.",
        };
      }

      // Verify OTP
      if (!verifyOTPCode(body.otpCode, otpRecord.otpCode)) {
        // Increment attempts
        await app.db
          .update(schema.otpVerifications)
          .set({ attempts: otpRecord.attempts + 1 })
          .where(eq(schema.otpVerifications.id, otpRecord.id));

        return {
          success: false,
          error: "Invalid OTP code",
        };
      }

      // Mark OTP as verified
      await app.db
        .update(schema.otpVerifications)
        .set({ verified: true })
        .where(eq(schema.otpVerifications.id, otpRecord.id));

      // Check if user exists
      let user = await app.db
        .select()
        .from(schema.userExtended)
        .where(eq(schema.userExtended.phoneNumber, normalizedPhone));

      if (user.length === 0) {
        // Create new user with trial
        if (!body.fullName) {
          return { success: false, error: "Full name required for new users" };
        }

        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14); // 14 days

        const [newUser] = await app.db
          .insert(schema.userExtended)
          .values({
            userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            fullName: body.fullName,
            phoneNumber: normalizedPhone,
            subscriptionStatus: "trial",
            trialEndDate,
          })
          .returning();

        user = [newUser];

        app.logger.info({ userId: newUser.userId }, "New user created");
      }

      const userData = user[0];

      // Register device
      if (body.deviceId) {
        const existingDevice = await app.db
          .select()
          .from(schema.deviceRegistrations)
          .where(
            eq(schema.deviceRegistrations.deviceId, body.deviceId)
          );

        if (existingDevice.length === 0) {
          await app.db
            .insert(schema.deviceRegistrations)
            .values({
              userId: userData.userId,
              deviceId: body.deviceId,
            });
        }
      }

      app.logger.info(
        { userId: userData.userId, phoneNumber: normalizedPhone },
        "User authenticated via OTP"
      );

      return {
        success: true,
        user: {
          id: userData.userId,
          fullName: userData.fullName,
          phoneNumber: userData.phoneNumber,
          subscriptionStatus: userData.subscriptionStatus,
          trialEndDate: userData.trialEndDate,
        },
      };
    } catch (error) {
      app.logger.error(
        { err: error, phoneNumber: body.phoneNumber },
        "Failed to verify OTP"
      );
      throw error;
    }
  });

  // POST /api/phone/resend-otp - Resend OTP
  fastify.post("/api/phone/resend-otp", async (request: FastifyRequest) => {
    const body = request.body as { phoneNumber: string };

    app.logger.info({ phoneNumber: body.phoneNumber }, "Resending OTP");

    try {
      if (!validateGhanaPhoneNumber(body.phoneNumber)) {
        return { success: false, error: "Invalid phone number format" };
      }

      const normalizedPhone = normalizePhoneNumber(body.phoneNumber);

      // Check rate limit
      if (!checkOTPRateLimit(normalizedPhone)) {
        return {
          success: false,
          error: "Too many OTP requests. Please try again in 1 hour.",
        };
      }

      // Generate and store new OTP
      const otpCode = generateOTPCode();
      const hashedOTP = hashOTPCode(otpCode);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await app.db
        .insert(schema.otpVerifications)
        .values({
          phoneNumber: normalizedPhone,
          otpCode: hashedOTP,
          expiresAt,
          verified: false,
          attempts: 0,
        });

      // Send OTP
      const smsResult = await sendOTPViaSMS(normalizedPhone, otpCode);

      if (!smsResult.success) {
        return {
          success: false,
          error: "Failed to send OTP. Please try again.",
        };
      }

      app.logger.info(
        { phoneNumber: normalizedPhone },
        "OTP resent successfully"
      );

      return {
        success: true,
        expiresIn: 600,
      };
    } catch (error) {
      app.logger.error(
        { err: error, phoneNumber: body.phoneNumber },
        "Failed to resend OTP"
      );
      throw error;
    }
  });
}
