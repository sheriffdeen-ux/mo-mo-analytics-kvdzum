/**
 * Authentication Middleware - Validates tokens from requests
 */

import type { FastifyRequest } from "fastify";
import { verifyToken } from "./token-service.js";

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null;
  }

  return parts[1];
}

/**
 * Validate token and get user ID from it
 */
export function validateTokenAndGetUserId(
  token: string
): { valid: boolean; userId?: string; phoneNumber?: string; error?: string } {
  const result = verifyToken(token);

  if (!result.valid) {
    return {
      valid: false,
      error: result.error || "Invalid token",
    };
  }

  if (!result.payload) {
    return {
      valid: false,
      error: "Token payload is missing",
    };
  }

  return {
    valid: true,
    userId: result.payload.userId,
    phoneNumber: result.payload.phoneNumber,
  };
}

/**
 * Extract and validate token from request
 */
export function extractAndValidateToken(
  request: FastifyRequest
): { valid: boolean; userId?: string; phoneNumber?: string; error?: string } {
  const token = extractBearerToken(request);

  if (!token) {
    return {
      valid: false,
      error: "Missing or invalid Authorization header",
    };
  }

  return validateTokenAndGetUserId(token);
}
