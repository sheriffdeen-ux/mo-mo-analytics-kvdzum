/**
 * Development/Testing Utilities
 * These endpoints are for testing and development only
 */

/**
 * Check if development/testing mode is enabled
 * Testing endpoints are available when:
 * - NODE_ENV is "development" or "test"
 * - ENABLE_DEV_TESTING environment variable is "true"
 */
export function isDevTestingEnabled(): boolean {
  const nodeEnv = process.env.NODE_ENV || "development";
  const enableDevTesting = process.env.ENABLE_DEV_TESTING;

  // Always allow in development/test environments
  if (nodeEnv === "development" || nodeEnv === "test") {
    return true;
  }

  // Explicitly enable via environment variable for other environments
  return enableDevTesting === "true";
}

/**
 * Get development testing status message
 */
export function getDevTestingStatusMessage(): string {
  if (isDevTestingEnabled()) {
    return "⚠️ DEVELOPMENT TESTING MODE - Dev endpoints available";
  }
  return "🔒 Production mode - Dev endpoints disabled";
}

/**
 * Log development testing status on startup
 */
export function logDevTestingStatus(logger?: any): void {
  const enabled = isDevTestingEnabled();
  const message = getDevTestingStatusMessage();

  logger?.info(
    {
      devTestingEnabled: enabled,
      nodeEnv: process.env.NODE_ENV || "development",
    },
    message
  );
}
