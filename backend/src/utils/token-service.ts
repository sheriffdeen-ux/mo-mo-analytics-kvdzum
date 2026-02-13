/**
 * Token Service - Generates and validates authentication tokens
 */

import crypto from "crypto";

export interface TokenPayload {
  userId: string;
  phoneNumber: string;
  createdAt: number;
  expiresAt: number;
}

const TOKEN_SECRET = process.env.TOKEN_SECRET || "momo-analytics-secret-key-default";
const TOKEN_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Generate an authentication token
 */
export function generateToken(userId: string, phoneNumber: string): string {
  const now = Date.now();
  const expiresAt = now + TOKEN_EXPIRATION_MS;

  const payload: TokenPayload = {
    userId,
    phoneNumber,
    createdAt: now,
    expiresAt,
  };

  // Create a JSON payload with HMAC signature
  const payloadStr = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payloadStr)
    .digest("hex");

  // Combine payload and signature
  const token = Buffer.from(`${payloadStr}.${signature}`).toString("base64");

  return token;
}

/**
 * Verify and decode an authentication token
 */
export function verifyToken(
  token: string
): { valid: boolean; payload?: TokenPayload; error?: string } {
  try {
    // Decode base64
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [payloadStr, signature] = decoded.split(".");

    if (!payloadStr || !signature) {
      return { valid: false, error: "Invalid token format" };
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", TOKEN_SECRET)
      .update(payloadStr)
      .digest("hex");

    if (signature !== expectedSignature) {
      return { valid: false, error: "Invalid token signature" };
    }

    // Parse payload
    const payload: TokenPayload = JSON.parse(payloadStr);

    // Check expiration
    if (Date.now() > payload.expiresAt) {
      return { valid: false, error: "Token expired" };
    }

    return { valid: true, payload };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return { valid: false, error: `Token verification failed: ${errorMsg}` };
  }
}

/**
 * Get token expiration time in seconds
 */
export function getTokenExpirationSeconds(): number {
  return Math.round(TOKEN_EXPIRATION_MS / 1000);
}
