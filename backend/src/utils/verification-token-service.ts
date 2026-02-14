/**
 * Verification Token Service
 * Generates and validates email verification tokens
 */

import { randomUUID } from "crypto";

/**
 * Generate a verification token (UUID)
 */
export function generateVerificationToken(): string {
  return randomUUID();
}

/**
 * Get token expiry time (24 hours from now)
 */
export function getTokenExpiryTime(): Date {
  const expiryTime = new Date();
  expiryTime.setHours(expiryTime.getHours() + 24);
  return expiryTime;
}

/**
 * Check if a token has expired
 */
export function isTokenExpired(expiryTime: Date): boolean {
  return new Date() > expiryTime;
}

/**
 * Format token expiry for display
 */
export function formatTokenExpiry(expiryTime: Date): string {
  return expiryTime.toISOString();
}

/**
 * Get verification link
 */
export function getVerificationLink(
  frontendUrl: string,
  token: string
): string {
  const baseUrl = frontendUrl.endsWith("/")
    ? frontendUrl.slice(0, -1)
    : frontendUrl;
  return `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
}
