/**
 * Device Fingerprint Service - Generates and validates device fingerprints
 */

import crypto from "crypto";

export interface DeviceFingerprintData {
  deviceId: string;
  userAgent: string;
  acceptLanguage?: string;
  timezoneOffset?: number;
}

/**
 * Generate a device fingerprint from device data
 */
export function generateDeviceFingerprint(data: DeviceFingerprintData): string {
  const fingerprintStr = JSON.stringify({
    deviceId: data.deviceId,
    userAgent: data.userAgent,
    acceptLanguage: data.acceptLanguage || "",
    timezoneOffset: data.timezoneOffset || 0,
  });

  return crypto.createHash("sha256").update(fingerprintStr).digest("hex");
}

/**
 * Extract device fingerprint from request headers
 */
export function extractDeviceFingerprintFromRequest(request: any): DeviceFingerprintData {
  const deviceId = request.headers["x-device-id"] || "unknown";
  const userAgent = request.headers["user-agent"] || "";
  const acceptLanguage = request.headers["accept-language"];
  const timezoneOffset = request.headers["x-timezone-offset"]
    ? parseInt(request.headers["x-timezone-offset"], 10)
    : 0;

  return {
    deviceId,
    userAgent,
    acceptLanguage,
    timezoneOffset,
  };
}

/**
 * Check if a device fingerprint matches a stored one (exact match)
 */
export function isDeviceFingerprintMatch(fp1: string, fp2: string): boolean {
  return fp1 === fp2;
}

/**
 * Generate a simple device ID if not provided
 */
export function generateDeviceId(): string {
  return crypto.randomBytes(16).toString("hex");
}
