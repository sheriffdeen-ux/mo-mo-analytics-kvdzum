/**
 * OTP Service - Handles OTP generation, hashing, and verification
 */

import crypto from "crypto";

/**
 * Generate a random 6-digit OTP code
 */
export function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash an OTP code using SHA-256
 */
export function hashOTPCode(otpCode: string): string {
  return crypto.createHash("sha256").update(otpCode).digest("hex");
}

/**
 * Verify an OTP code against a hashed version
 */
export function verifyOTPCode(otpCode: string, hashedOTP: string): boolean {
  const hash = hashOTPCode(otpCode);
  return hash === hashedOTP;
}

/**
 * Validate Ghana phone number format
 */
export function validateGhanaPhoneNumber(phoneNumber: string): boolean {
  // Accept formats: +233XXXXXXXXX, 0233XXXXXXXXX, etc.
  const ghanaPhoneRegex = /^(\+233|0)?[0-9]{9,10}$/;
  return ghanaPhoneRegex.test(phoneNumber.replace(/\s+/g, ""));
}

/**
 * Normalize phone number to +233 format
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  let normalized = phoneNumber.replace(/\s+/g, "");

  if (normalized.startsWith("0")) {
    // 0XXXXXXXXXX -> +233XXXXXXXXX
    normalized = "+233" + normalized.substring(1);
  } else if (!normalized.startsWith("+233")) {
    // XXXXXXXXX -> +233XXXXXXXXX
    normalized = "+233" + normalized;
  }

  return normalized;
}
