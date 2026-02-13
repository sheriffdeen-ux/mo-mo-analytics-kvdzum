/**
 * Password Service - Hashing and verification for user passwords
 */

import crypto from "crypto";

/**
 * Hash a password using PBKDF2 with SHA-256
 * (Using Node's built-in crypto for cross-platform compatibility)
 */
export function hashPassword(password: string, salt?: Buffer): { hash: string; salt: string } {
  const passwordSalt = salt || crypto.randomBytes(32);

  // PBKDF2: 100,000 iterations, SHA-256, 64 byte key
  const hash = crypto
    .pbkdf2Sync(password, passwordSalt, 100000, 64, "sha256")
    .toString("hex");

  return {
    hash,
    salt: passwordSalt.toString("hex"),
  };
}

/**
 * Verify a password against its hash and salt
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const saltBuffer = Buffer.from(salt, "hex");
  const { hash: computedHash } = hashPassword(password, saltBuffer);

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(computedHash),
    Buffer.from(hash)
  );
}

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one digit");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Normalize email (lowercase)
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
