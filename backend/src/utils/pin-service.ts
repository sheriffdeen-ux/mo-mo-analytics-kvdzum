/**
 * PIN Service - Hashing and verification for device PINs
 */

import crypto from "crypto";

/**
 * Hash a PIN using SHA-256
 */
export function hashPIN(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

/**
 * Verify a PIN against its hash
 */
export function verifyPIN(pin: string, hash: string): boolean {
  const inputHash = hashPIN(pin);
  return inputHash === hash;
}

/**
 * Validate PIN format (4-6 digits)
 */
export function validatePINFormat(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}
