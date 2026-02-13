
import Constants from "expo-constants";
import { Platform } from "react-native";

const MUTED_MESSAGES = [
  "Fetch error (will not repeat)",
  "Non-Error promise rejection captured",
];

const FLUSH_INTERVAL = 5000;

function clearLogAfterDelay(logKey: string) {
  setTimeout(() => {
    if (Platform.OS === "web") {
      try {
        localStorage.removeItem(logKey);
      } catch (e) {
        // Ignore storage errors
      }
    }
  }, 60000);
}

function shouldMuteMessage(message: string): boolean {
  return MUTED_MESSAGES.some((muted) => message.includes(muted));
}

function getPlatformName(): string {
  if (Platform.OS === "web") return "web";
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "unknown";
}

function getLogServerUrl(): string | null {
  const backendUrl = Constants.expoConfig?.extra?.backendUrl;
  if (!backendUrl) return null;
  return `${backendUrl}/api/logs`;
}

let logQueue: Array<{ level: string; message: string; timestamp: number; platform: string }> = [];
let flushTimer: NodeJS.Timeout | null = null;

function flushLogs() {
  if (logQueue.length === 0) return;

  const serverUrl = getLogServerUrl();
  if (!serverUrl) {
    logQueue = [];
    return;
  }

  const logsToSend = [...logQueue];
  logQueue = [];

  fetch(serverUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ logs: logsToSend }),
  }).catch(() => {
    // Silently fail - don't want to create infinite error loops
  });
}

function queueLog(level: string, message: string, source: string) {
  if (shouldMuteMessage(message)) return;

  const platform = getPlatformName();
  const timestamp = Date.now();

  logQueue.push({
    level,
    message: `[${source}] ${message}`,
    timestamp,
    platform,
  });

  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushLogs, FLUSH_INTERVAL);
}

function sendErrorToParent(level: string, message: string, data: any) {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.parent !== window) {
    try {
      window.parent.postMessage(
        {
          type: "console-log",
          level,
          message,
          data,
          timestamp: Date.now(),
        },
        "*"
      );
    } catch (e) {
      // Ignore postMessage errors
    }
  }
}

function extractSourceLocation(stack: string): string {
  const lines = stack.split("\n");
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("errorLogger")) continue;
    const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
    if (match) {
      return `${match[1]} (${match[2]}:${match[3]})`;
    }
    const simpleMatch = line.match(/at\s+(.+?):(\d+):(\d+)/);
    if (simpleMatch) {
      return `${simpleMatch[1]}:${simpleMatch[2]}`;
    }
  }
  return "unknown";
}

function getCallerInfo(): string {
  try {
    const stack = new Error().stack || "";
    return extractSourceLocation(stack);
  } catch {
    return "unknown";
  }
}

function stringifyArgs(args: any[]): string {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    })
    .join(" ");
}

// Safe console logging function
function safeConsoleLog(level: 'log' | 'error' | 'warn' | 'info', ...args: any[]) {
  try {
    if (typeof console !== 'undefined' && console[level]) {
      // Use the native console method directly
      console[level](...args);
    }
  } catch (e) {
    // If console fails, try to at least alert in development
    if (__DEV__) {
      try {
        // Last resort: try to show something
        if (typeof alert !== 'undefined') {
          alert(`Console ${level}: ${args.join(' ')}`);
        }
      } catch {
        // Give up silently
      }
    }
  }
}

// Intercept console methods
if (typeof console !== "undefined") {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;

  console.log = function (...args: any[]) {
    const message = stringifyArgs(args);
    const source = getCallerInfo();
    queueLog("log", message, source);
    sendErrorToParent("log", message, args);
    try {
      originalLog.apply(console, args);
    } catch (e) {
      safeConsoleLog('log', ...args);
    }
  };

  console.error = function (...args: any[]) {
    const message = stringifyArgs(args);
    const source = getCallerInfo();
    queueLog("error", message, source);
    sendErrorToParent("error", message, args);
    try {
      originalError.apply(console, args);
    } catch (e) {
      safeConsoleLog('error', ...args);
    }
  };

  console.warn = function (...args: any[]) {
    const message = stringifyArgs(args);
    const source = getCallerInfo();
    queueLog("warn", message, source);
    sendErrorToParent("warn", message, args);
    try {
      originalWarn.apply(console, args);
    } catch (e) {
      safeConsoleLog('warn', ...args);
    }
  };

  console.info = function (...args: any[]) {
    const message = stringifyArgs(args);
    const source = getCallerInfo();
    queueLog("info", message, source);
    sendErrorToParent("info", message, args);
    try {
      originalInfo.apply(console, args);
    } catch (e) {
      safeConsoleLog('info', ...args);
    }
  };
}

// Intercept fetch for network error logging
const originalFetch = global.fetch;
global.fetch = async function (...args: any[]) {
  try {
    const response = await originalFetch.apply(global, args);
    return response;
  } catch (e: any) {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "unknown";
    const errorMessage = `Fetch error for ${url}: ${e.message || e}`;
    
    // Use safe console logging
    safeConsoleLog('error', '[Natively] Fetch error:', e.message || e);
    
    queueLog("error", errorMessage, "fetch");
    sendErrorToParent("error", errorMessage, { url, error: e.message });
    throw e;
  }
};

// Export utility functions for manual logging
export const logError = (message: string, error?: any) => {
  const errorMessage = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const fullMessage = error ? `${message} - ${errorMessage}` : message;
  safeConsoleLog('error', '[Natively]', fullMessage);
  queueLog("error", fullMessage, "manual");
};

export const logWarning = (message: string) => {
  safeConsoleLog('warn', '[Natively]', message);
  queueLog("warn", message, "manual");
};

export const logInfo = (message: string) => {
  safeConsoleLog('info', '[Natively]', message);
  queueLog("info", message, "manual");
};
