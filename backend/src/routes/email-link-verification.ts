import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";
import {
  generateVerificationToken,
  getTokenExpiryTime,
  isTokenExpired,
  getVerificationLink,
} from "../utils/verification-token-service.js";
import { sendVerificationLinkEmail } from "../utils/email-service.js";

// In-memory rate limiting for verification email sends (3 per hour per email)
const verificationEmailLimiter = new Map<
  string,
  { count: number; resetTime: number }
>();

/**
 * Check verification email rate limit (3 per hour per email)
 */
function checkVerificationEmailRateLimit(email: string): boolean {
  const now = Date.now();
  const limit = verificationEmailLimiter.get(email);

  if (!limit || now > limit.resetTime) {
    verificationEmailLimiter.set(email, {
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

export function registerEmailLinkVerificationRoutes(
  app: App,
  fastify: FastifyInstance
) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  // POST /api/auth/send-verification-link - Send email verification link
  fastify.post(
    "/api/auth/send-verification-link",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as {
        email: string;
      };

      app.logger.info(
        { email: body.email },
        "Email verification link request"
      );

      try {
        // Check rate limit
        if (!checkVerificationEmailRateLimit(body.email)) {
          return {
            success: false,
            error:
              "Too many verification emails sent. Please try again in 1 hour.",
          };
        }

        // Find user
        const [user] = await app.db
          .select()
          .from(schema.userExtended)
          .where(eq(schema.userExtended.email, body.email));

        if (!user) {
          // Don't reveal if email exists or not (security)
          return {
            success: true,
            message:
              "If an account exists with this email, a verification link has been sent.",
          };
        }

        // If already verified, no need to send again
        if (user.emailVerified) {
          return {
            success: true,
            message: "This email is already verified.",
          };
        }

        // Generate new verification token
        const token = generateVerificationToken();
        const tokenExpiry = getTokenExpiryTime();

        // Update user with verification token
        await app.db
          .update(schema.userExtended)
          .set({
            verificationToken: token,
            verificationTokenExpiry: tokenExpiry,
          })
          .where(eq(schema.userExtended.email, body.email));

        // Generate verification link
        const verificationLink = getVerificationLink(frontendUrl, token);

        // Send email
        const emailResult = await sendVerificationLinkEmail(
          body.email,
          user.fullName || "User",
          verificationLink,
          app.logger
        );

        if (!emailResult.success) {
          app.logger.error(
            { email: body.email },
            "Failed to send verification link email"
          );
          return {
            success: false,
            error:
              emailResult.error ||
              "Failed to send verification email. Please try again.",
          };
        }

        app.logger.info(
          { email: body.email },
          "Verification link email sent successfully"
        );

        return {
          success: true,
          message:
            "Verification link has been sent to your email. Please check your inbox.",
        };
      } catch (error) {
        app.logger.error(
          { err: error, email: body.email },
          "Failed to send verification link"
        );
        throw error;
      }
    }
  );

  // GET /api/auth/verify-email-link - Verify email using token
  fastify.get(
    "/api/auth/verify-email-link",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = (request.query as any).token as string;

      if (!token) {
        return {
          success: false,
          error: "Verification token is required",
        };
      }

      app.logger.info({ token: token.substring(0, 8) }, "Email verification link clicked");

      try {
        // Find user by verification token
        const [user] = await app.db
          .select()
          .from(schema.userExtended)
          .where(eq(schema.userExtended.verificationToken, token));

        if (!user) {
          return {
            success: false,
            error: "Invalid or expired verification token",
          };
        }

        // Check if already verified
        if (user.emailVerified) {
          return {
            success: true,
            message: "Email is already verified",
            emailVerified: true,
          };
        }

        // Check if token has expired
        if (!user.verificationTokenExpiry || isTokenExpired(user.verificationTokenExpiry)) {
          return {
            success: false,
            error: "Verification token has expired. Please request a new one.",
          };
        }

        // Mark email as verified and clear token
        await app.db
          .update(schema.userExtended)
          .set({
            emailVerified: true,
            verificationToken: null,
            verificationTokenExpiry: null,
          })
          .where(eq(schema.userExtended.userId, user.userId));

        app.logger.info(
          { userId: user.userId, email: user.email },
          "Email verified successfully via link"
        );

        return {
          success: true,
          message: "Email verified successfully",
          emailVerified: true,
          user: {
            id: user.userId,
            email: user.email,
            fullName: user.fullName,
          },
        };
      } catch (error) {
        app.logger.error(
          { err: error, token: token.substring(0, 8) },
          "Email verification failed"
        );
        throw error;
      }
    }
  );

  // POST /api/auth/resend-verification-link - Resend verification link
  fastify.post(
    "/api/auth/resend-verification-link",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as {
        email: string;
      };

      app.logger.info(
        { email: body.email },
        "Resend verification link request"
      );

      try {
        // Check rate limit
        if (!checkVerificationEmailRateLimit(body.email)) {
          return {
            success: false,
            error:
              "Too many verification emails sent. Please try again in 1 hour.",
          };
        }

        // Find user
        const [user] = await app.db
          .select()
          .from(schema.userExtended)
          .where(eq(schema.userExtended.email, body.email));

        if (!user) {
          // Don't reveal if email exists
          return {
            success: true,
            message:
              "If an account exists with this email, a verification link has been sent.",
          };
        }

        // If already verified
        if (user.emailVerified) {
          return {
            success: true,
            message: "This email is already verified.",
          };
        }

        // Generate new verification token
        const token = generateVerificationToken();
        const tokenExpiry = getTokenExpiryTime();

        // Update user with new verification token
        await app.db
          .update(schema.userExtended)
          .set({
            verificationToken: token,
            verificationTokenExpiry: tokenExpiry,
          })
          .where(eq(schema.userExtended.email, body.email));

        // Generate verification link
        const verificationLink = getVerificationLink(frontendUrl, token);

        // Send email
        const emailResult = await sendVerificationLinkEmail(
          body.email,
          user.fullName || "User",
          verificationLink,
          app.logger
        );

        if (!emailResult.success) {
          return {
            success: false,
            error:
              emailResult.error ||
              "Failed to send verification email. Please try again.",
          };
        }

        app.logger.info(
          { email: body.email },
          "Verification link email resent successfully"
        );

        return {
          success: true,
          message:
            "Verification link has been sent to your email. Please check your inbox.",
        };
      } catch (error) {
        app.logger.error(
          { err: error, email: body.email },
          "Failed to resend verification link"
        );
        throw error;
      }
    }
  );
}
