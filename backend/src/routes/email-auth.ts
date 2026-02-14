import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  validateEmail,
  normalizeEmail,
} from "../utils/password-service.js";
import { generateToken, getTokenExpirationSeconds } from "../utils/token-service.js";
import { logAuthEvent } from "../utils/audit-log.js";
import {
  generateVerificationToken,
  getTokenExpiryTime,
  getVerificationLink,
} from "../utils/verification-token-service.js";
import { sendVerificationLinkEmail } from "../utils/email-service.js";

// In-memory rate limiting for login attempts (3 per 15 minutes per email)
const loginAttempts = new Map<string, { count: number; resetTime: number }>();

/**
 * Check login rate limit (3 per 15 minutes per email)
 */
function checkLoginRateLimit(email: string): boolean {
  const now = Date.now();
  const limit = loginAttempts.get(email);

  if (!limit || now > limit.resetTime) {
    loginAttempts.set(email, {
      count: 1,
      resetTime: now + 15 * 60 * 1000, // 15 minutes
    });
    return true;
  }

  if (limit.count < 3) {
    limit.count++;
    return true;
  }

  return false;
}

export function registerEmailAuthRoutes(app: App, fastify: FastifyInstance) {
  // POST /api/auth/signup - Sign up with email and password
  fastify.post(
    "/api/auth/signup",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as {
        email: string;
        password: string;
        fullName: string;
        phoneNumber?: string;
        deviceId?: string;
      };

      const normalizedEmail = normalizeEmail(body.email);

      app.logger.info({ email: normalizedEmail }, "User signup attempt");

      try {
        // Validate inputs
        if (!validateEmail(body.email)) {
          return {
            success: false,
            error: "Invalid email format",
          };
        }

        if (!body.fullName || body.fullName.trim().length === 0) {
          return {
            success: false,
            error: "Full name is required",
          };
        }

        if (!body.phoneNumber || body.phoneNumber.trim().length === 0) {
          return {
            success: false,
            error: "Phone number is required",
          };
        }

        // Validate password strength
        const passwordValidation = validatePasswordStrength(body.password);
        if (!passwordValidation.valid) {
          return {
            success: false,
            error: "Password does not meet requirements",
            errors: passwordValidation.errors,
          };
        }

        // Check if email already exists
        const existingUser = await app.db
          .select()
          .from(schema.userExtended)
          .where(eq(schema.userExtended.email, normalizedEmail));

        if (existingUser.length > 0) {
          app.logger.warn({ email: normalizedEmail }, "Email already registered");
          return {
            success: false,
            error: "Email already registered",
          };
        }

        // Hash password
        const { hash, salt } = hashPassword(body.password);

        // Create new user with 14-day trial
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);

        // Generate verification token
        const verificationToken = generateVerificationToken();
        const verificationTokenExpiry = getTokenExpiryTime();

        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const [newUser] = await app.db
          .insert(schema.userExtended)
          .values({
            userId,
            fullName: body.fullName.trim(),
            email: normalizedEmail,
            emailVerified: true, // Auto-verify email on signup for immediate access
            passwordHash: hash,
            passwordSalt: salt,
            phoneNumber: body.phoneNumber.trim(),
            subscriptionStatus: "trial",
            trialEndDate,
            verificationToken,
            verificationTokenExpiry,
          })
          .returning();

        // Create user settings
        await app.db
          .insert(schema.userSettings)
          .values({
            userId,
          });

        // Register device if provided
        if (body.deviceId) {
          const existingDevice = await app.db
            .select()
            .from(schema.deviceRegistrations)
            .where(eq(schema.deviceRegistrations.deviceId, body.deviceId));

          if (existingDevice.length === 0) {
            await app.db.insert(schema.deviceRegistrations).values({
              userId,
              deviceId: body.deviceId,
            });
          }
        }

        // Send verification link email asynchronously (non-blocking)
        // This is kept for future production use where email verification may be required
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const verificationLink = getVerificationLink(frontendUrl, verificationToken);

        // Fire and forget - don't block signup response
        sendVerificationLinkEmail(
          normalizedEmail,
          body.fullName.trim(),
          verificationLink,
          app.logger
        ).catch((error) => {
          app.logger.warn(
            { email: normalizedEmail, err: error },
            "Failed to send verification email during signup (non-blocking)"
          );
        });

        // Generate authentication token (30-day expiration)
        const accessToken = generateToken(userId, normalizedEmail);
        const expiresIn = getTokenExpirationSeconds();

        await logAuthEvent(app, userId, "SIGNUP", true, request);

        app.logger.info(
          { userId, email: normalizedEmail, emailVerified: true },
          "User signup successful with auto-verified email"
        );

        return {
          success: true,
          user: {
            id: userId,
            fullName: newUser.fullName,
            email: newUser.email,
            phoneNumber: newUser.phoneNumber,
            subscriptionStatus: newUser.subscriptionStatus,
            trialEndDate: newUser.trialEndDate,
            emailVerified: newUser.emailVerified,
          },
          accessToken,
          expiresIn,
          tokenType: "Bearer",
          message: "Account created successfully. You can start using MoMo Analytics immediately!",
        };
      } catch (error) {
        app.logger.error(
          { err: error, email: body.email },
          "Signup failed"
        );
        await logAuthEvent(app, undefined, "SIGNUP", false, request);
        throw error;
      }
    }
  );

  // POST /api/auth/login - Login with email and password
  fastify.post(
    "/api/auth/login",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as {
        email: string;
        password: string;
        deviceId?: string;
      };

      const normalizedEmail = normalizeEmail(body.email);

      app.logger.info({ email: normalizedEmail }, "User login attempt");

      try {
        // Check rate limit
        if (!checkLoginRateLimit(normalizedEmail)) {
          app.logger.warn(
            { email: normalizedEmail },
            "Login rate limit exceeded"
          );
          return {
            success: false,
            error: "Too many login attempts. Please try again in 15 minutes.",
          };
        }

        // Validate email format
        if (!validateEmail(body.email)) {
          return {
            success: false,
            error: "Invalid email or password",
          };
        }

        // Find user by email
        const [user] = await app.db
          .select()
          .from(schema.userExtended)
          .where(eq(schema.userExtended.email, normalizedEmail));

        if (!user) {
          app.logger.warn({ email: normalizedEmail }, "User not found");
          return {
            success: false,
            error: "Invalid email or password",
          };
        }

        // Verify password
        if (!user.passwordHash || !user.passwordSalt) {
          app.logger.warn(
            { email: normalizedEmail },
            "User has no password set"
          );
          return {
            success: false,
            error: "Invalid email or password",
          };
        }

        if (!verifyPassword(body.password, user.passwordHash, user.passwordSalt)) {
          await logAuthEvent(app, user.userId, "LOGIN", false, request);
          return {
            success: false,
            error: "Invalid email or password",
          };
        }

        // Check if trial has expired
        let subscriptionStatus = user.subscriptionStatus;
        if (user.subscriptionStatus === "trial" && user.trialEndDate) {
          if (new Date() > user.trialEndDate) {
            // Auto-downgrade to free tier
            await app.db
              .update(schema.userExtended)
              .set({ subscriptionStatus: "free" })
              .where(eq(schema.userExtended.userId, user.userId));

            subscriptionStatus = "free";
            app.logger.info(
              { userId: user.userId },
              "Trial expired, downgraded to free"
            );
          }
        }

        // Register device if provided
        if (body.deviceId) {
          const existingDevice = await app.db
            .select()
            .from(schema.deviceRegistrations)
            .where(eq(schema.deviceRegistrations.deviceId, body.deviceId));

          if (existingDevice.length === 0) {
            await app.db
              .insert(schema.deviceRegistrations)
              .values({
                userId: user.userId,
                deviceId: body.deviceId,
              });
          }
        }

        // Update last login
        await app.db
          .update(schema.userExtended)
          .set({ lastLoginAt: new Date() })
          .where(eq(schema.userExtended.userId, user.userId));

        // Generate authentication token (30-day expiration)
        const accessToken = generateToken(user.userId, normalizedEmail);
        const expiresIn = getTokenExpirationSeconds();

        await logAuthEvent(app, user.userId, "LOGIN", true, request);

        app.logger.info(
          { userId: user.userId, email: normalizedEmail },
          "User login successful"
        );

        return {
          success: true,
          user: {
            id: user.userId,
            fullName: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber || undefined,
            subscriptionStatus,
            trialEndDate: user.trialEndDate,
          },
          accessToken,
          expiresIn,
          tokenType: "Bearer",
        };
      } catch (error) {
        app.logger.error(
          { err: error, email: body.email },
          "Login failed"
        );
        throw error;
      }
    }
  );

  // POST /api/auth/change-password - Change password (requires authentication)
  fastify.post(
    "/api/auth/change-password",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await app.requireAuth()(request, reply);
      if (!session) return;

      const body = request.body as {
        currentPassword: string;
        newPassword: string;
      };

      app.logger.info({ userId: session.user.id }, "Password change attempt");

      try {
        // Get user
        const [user] = await app.db
          .select()
          .from(schema.userExtended)
          .where(eq(schema.userExtended.userId, session.user.id));

        if (!user) {
          return { success: false, error: "User not found" };
        }

        // Verify current password
        if (!user.passwordHash || !user.passwordSalt) {
          return {
            success: false,
            error: "Account does not have a password set",
          };
        }

        if (!verifyPassword(body.currentPassword, user.passwordHash, user.passwordSalt)) {
          await logAuthEvent(app, session.user.id, "PASSWORD_CHANGE", false, request);
          return {
            success: false,
            error: "Invalid current password",
          };
        }

        // Validate new password strength
        const passwordValidation = validatePasswordStrength(body.newPassword);
        if (!passwordValidation.valid) {
          return {
            success: false,
            error: "New password does not meet requirements",
            errors: passwordValidation.errors,
          };
        }

        // Hash new password
        const { hash, salt } = hashPassword(body.newPassword);

        // Update password
        await app.db
          .update(schema.userExtended)
          .set({
            passwordHash: hash,
            passwordSalt: salt,
          })
          .where(eq(schema.userExtended.userId, session.user.id));

        await logAuthEvent(app, session.user.id, "PASSWORD_CHANGE", true, request);

        app.logger.info(
          { userId: session.user.id },
          "Password changed successfully"
        );

        return {
          success: true,
          message: "Password changed successfully",
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          "Password change failed"
        );
        throw error;
      }
    }
  );

  // POST /api/auth/logout - Logout (invalidate token on client side)
  fastify.post(
    "/api/auth/logout",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await app.requireAuth()(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, "User logout");

      try {
        await logAuthEvent(app, session.user.id, "LOGOUT", true, request);

        return {
          success: true,
          message: "Logged out successfully",
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          "Logout failed"
        );
        throw error;
      }
    }
  );

  // GET /api/auth/profile - Get authenticated user profile
  fastify.get(
    "/api/auth/profile",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await app.requireAuth()(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, "Fetching user profile");

      try {
        // Get user
        const [user] = await app.db
          .select()
          .from(schema.userExtended)
          .where(eq(schema.userExtended.userId, session.user.id));

        if (!user) {
          return { success: false, error: "User not found" };
        }

        // Check if trial has expired
        let subscriptionStatus = user.subscriptionStatus;
        if (user.subscriptionStatus === "trial" && user.trialEndDate) {
          if (new Date() > user.trialEndDate) {
            // Auto-downgrade to free tier
            await app.db
              .update(schema.userExtended)
              .set({ subscriptionStatus: "free" })
              .where(eq(schema.userExtended.userId, user.userId));

            subscriptionStatus = "free";
          }
        }

        return {
          success: true,
          user: {
            id: user.userId,
            fullName: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber || undefined,
            businessName: user.businessName || undefined,
            subscriptionStatus,
            trialEndDate: user.trialEndDate,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
          },
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          "Failed to fetch user profile"
        );
        throw error;
      }
    }
  );

  // PUT /api/auth/profile - Update user profile
  fastify.put(
    "/api/auth/profile",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await app.requireAuth()(request, reply);
      if (!session) return;

      const body = request.body as {
        fullName?: string;
        phoneNumber?: string;
        businessName?: string;
      };

      app.logger.info({ userId: session.user.id }, "Updating user profile");

      try {
        // Get user
        const [user] = await app.db
          .select()
          .from(schema.userExtended)
          .where(eq(schema.userExtended.userId, session.user.id));

        if (!user) {
          return { success: false, error: "User not found" };
        }

        // Update profile
        const updateData: any = {};

        if (body.fullName && body.fullName.trim().length > 0) {
          updateData.fullName = body.fullName.trim();
        }

        if (body.phoneNumber !== undefined) {
          updateData.phoneNumber = body.phoneNumber || null;
        }

        if (body.businessName !== undefined) {
          updateData.businessName = body.businessName || null;
        }

        await app.db
          .update(schema.userExtended)
          .set(updateData)
          .where(eq(schema.userExtended.userId, session.user.id));

        app.logger.info(
          { userId: session.user.id },
          "User profile updated"
        );

        return {
          success: true,
          message: "Profile updated successfully",
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          "Failed to update profile"
        );
        throw error;
      }
    }
  );
}
