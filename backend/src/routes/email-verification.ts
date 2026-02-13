import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";
import {
  generateOTPCode,
  hashOTPCode,
  verifyOTPCode,
} from "../utils/otp-service.js";
import {
  sendVerificationEmail,
  isEmailVerificationRequired,
  getVerificationStatusMessage,
} from "../utils/email-service.js";
import { logAuthEvent } from "../utils/audit-log.js";

// In-memory rate limiting for email OTP requests (3 per hour per email)
const emailOTPRateLimiter = new Map<
  string,
  { count: number; resetTime: number }
>();

/**
 * Check email OTP rate limit (3 per hour per email)
 */
function checkEmailOTPRateLimit(email: string): boolean {
  const now = Date.now();
  const limit = emailOTPRateLimiter.get(email);

  if (!limit || now > limit.resetTime) {
    emailOTPRateLimiter.set(email, {
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

// Table to store email OTP verifications (can reuse existing otpVerifications table or create separate one)
// For now, we'll create a separate tracking, but use otpVerifications table with "email_" prefix for identifier
interface EmailOTPRecord {
  email: string;
  otpCode: string; // hashed
  expiresAt: Date;
  verified: boolean;
  attempts: number;
}

const emailOTPStore = new Map<string, EmailOTPRecord>();

export function registerEmailVerificationRoutes(
  app: App,
  fastify: FastifyInstance
) {
  const requireAuth = app.requireAuth();

  // POST /api/auth/send-verification-email - Send verification email with OTP
  fastify.post(
    "/api/auth/send-verification-email",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as {
        email: string;
      };

      app.logger.info(
        { email: body.email },
        "Email verification OTP request"
      );

      try {
        // Check rate limit
        if (!checkEmailOTPRateLimit(body.email)) {
          return {
            success: false,
            error:
              "Too many verification requests. Please try again in 1 hour.",
          };
        }

        // Generate OTP
        const otpCode = generateOTPCode();
        const hashedOTP = hashOTPCode(otpCode);

        // Calculate expiry (5 minutes)
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        // Store OTP in memory
        emailOTPStore.set(body.email, {
          email: body.email,
          otpCode: hashedOTP,
          expiresAt,
          verified: false,
          attempts: 0,
        });

        // Send email
        const sendResult = await sendVerificationEmail(
          body.email,
          body.email.split("@")[0], // Use email prefix as name placeholder
          otpCode,
          app.logger
        );

        if (!sendResult.success) {
          return {
            success: false,
            error: sendResult.error || "Failed to send verification email",
          };
        }

        app.logger.info(
          { email: body.email },
          "Verification email sent successfully"
        );

        // Return response based on verification requirement
        const requireVerification = isEmailVerificationRequired();
        const response: any = {
          success: true,
          message: "Verification email sent",
        };

        // In development mode without verification, return OTP for testing
        if (!requireVerification) {
          response.otpCode = otpCode;
          app.logger.warn(
            { email: body.email },
            "Returning OTP in response - email verification disabled"
          );
        }

        return response;
      } catch (error) {
        app.logger.error(
          { err: error, email: body.email },
          "Failed to send verification email"
        );
        throw error;
      }
    }
  );

  // POST /api/auth/verify-email - Verify email with OTP code
  fastify.post(
    "/api/auth/verify-email",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as {
        email: string;
        otpCode: string;
      };

      app.logger.info({ email: body.email }, "Email verification attempt");

      try {
        const requireVerification = isEmailVerificationRequired();

        // If verification is not required, auto-approve
        if (!requireVerification) {
          app.logger.info(
            { email: body.email },
            "Email verification disabled - auto-approving"
          );
          return {
            success: true,
            message: "Email verified successfully",
            verified: true,
          };
        }

        // Find OTP record
        const otpRecord = emailOTPStore.get(body.email);

        if (!otpRecord) {
          return {
            success: false,
            error: "Verification code not found or expired",
          };
        }

        // Check expiry
        if (new Date() > otpRecord.expiresAt) {
          emailOTPStore.delete(body.email);
          return {
            success: false,
            error: "Verification code has expired",
          };
        }

        // Check attempts
        if (otpRecord.attempts >= 3) {
          emailOTPStore.delete(body.email);
          return {
            success: false,
            error: "Maximum verification attempts exceeded. Request a new code.",
          };
        }

        // Verify OTP
        if (!verifyOTPCode(body.otpCode, otpRecord.otpCode)) {
          otpRecord.attempts++;
          return {
            success: false,
            error: "Invalid verification code",
          };
        }

        // Mark as verified
        otpRecord.verified = true;
        emailOTPStore.set(body.email, otpRecord);

        app.logger.info(
          { email: body.email },
          "Email verified successfully"
        );

        return {
          success: true,
          message: "Email verified successfully",
          verified: true,
        };
      } catch (error) {
        app.logger.error(
          { err: error, email: body.email },
          "Email verification failed"
        );
        throw error;
      }
    }
  );

  // GET /api/auth/email-verification-status - Check if email is verified
  fastify.get(
    "/api/auth/email-verification-status",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const email = (request.query as any).email as string;

      if (!email) {
        return {
          success: false,
          error: "Email parameter required",
        };
      }

      const otpRecord = emailOTPStore.get(email);
      const isVerified = otpRecord?.verified || false;
      const requireVerification = isEmailVerificationRequired();

      // If verification is not required, always return verified
      if (!requireVerification) {
        return {
          success: true,
          verified: true,
          requiresVerification: false,
        };
      }

      return {
        success: true,
        verified: isVerified,
        requiresVerification: requireVerification,
        expiresAt: otpRecord?.expiresAt || null,
      };
    }
  );

  // GET /api/auth/resend-verification-email - Resend verification email
  fastify.get(
    "/api/auth/resend-verification-email",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const email = (request.query as any).email as string;

      if (!email) {
        return {
          success: false,
          error: "Email parameter required",
        };
      }

      app.logger.info(
        { email },
        "Resending email verification OTP request"
      );

      try {
        // Check rate limit
        if (!checkEmailOTPRateLimit(email)) {
          return {
            success: false,
            error:
              "Too many verification requests. Please try again in 1 hour.",
          };
        }

        // Generate new OTP
        const otpCode = generateOTPCode();
        const hashedOTP = hashOTPCode(otpCode);

        // Calculate expiry (5 minutes)
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        // Store new OTP in memory
        emailOTPStore.set(email, {
          email,
          otpCode: hashedOTP,
          expiresAt,
          verified: false,
          attempts: 0,
        });

        // Send email
        const sendResult = await sendVerificationEmail(
          email,
          email.split("@")[0],
          otpCode,
          app.logger
        );

        if (!sendResult.success) {
          return {
            success: false,
            error: sendResult.error || "Failed to send verification email",
          };
        }

        app.logger.info(
          { email },
          "Verification email resent successfully"
        );

        const requireVerification = isEmailVerificationRequired();
        const response: any = {
          success: true,
          message: "Verification email sent",
        };

        // In development mode without verification, return OTP for testing
        if (!requireVerification) {
          response.otpCode = otpCode;
        }

        return response;
      } catch (error) {
        app.logger.error(
          { err: error, email },
          "Failed to resend verification email"
        );
        throw error;
      }
    }
  );
}
