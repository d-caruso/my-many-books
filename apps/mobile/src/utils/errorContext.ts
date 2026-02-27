import { Platform, Dimensions } from 'react-native';
import { ErrorContext } from '../services/errors/ErrorTrackingService';

/**
 * Collect comprehensive error context information
 */
export async function collectErrorContext(): Promise<Partial<ErrorContext>> {
  try {
    const context: Partial<ErrorContext> = {
      timestamp: Date.now(),
      userAgent: await getUserAgent(),
      appVersion: await getAppVersion(),
    };

    return context;
  } catch {
    // If context collection fails, return minimal context
    return {
      timestamp: Date.now(),
      appVersion: 'unknown',
      userAgent: 'unknown',
    };
  }
}

/**
 * Get user agent string for the device
 */
export async function getUserAgent(): Promise<string> {
  try {
    const { width, height } = Dimensions.get('window');
    const scale = Dimensions.get('window').scale;
    
    return `${Platform.OS}/${Platform.Version} (${width}x${height}@${scale}x) MyManyBooks/1.0.0`;
  } catch {
    return `${Platform.OS}/unknown MyManyBooks/unknown`;
  }
}

/**
 * Get app version information from package.json or expo config
 */
export async function getAppVersion(): Promise<string> {
  try {
    // Try to get from Expo Constants if available
    if (typeof require !== 'undefined') {
      try {
        const Constants = require('expo-constants');
        if (Constants.default?.expoConfig?.version) {
          const version = Constants.default.expoConfig.version;
          const buildNumber = Constants.default?.expoConfig?.ios?.buildNumber || 
                             Constants.default?.expoConfig?.android?.versionCode || 
                             '1';
          return `${version} (${buildNumber})`;
        }
      } catch {
        // Expo not available, continue with fallback
      }

      try {
        const packageJson = require('../../package.json');
        return `${packageJson.version} (1)`;
      } catch {
        // Package.json not accessible
      }
    }
    
    // Environment variable fallback
    if (typeof process !== 'undefined' && process.env) {
      const version = process.env.npm_package_version || process.env.EXPO_VERSION;
      if (version) return `${version} (1)`;
    }
    
    return '1.0.0 (1)';
  } catch {
    return 'unknown';
  }
}

/**
 * Get memory usage information using performance APIs where available
 */
export async function getMemoryUsage(): Promise<number | undefined> {
  try {
    // Web environment: Use performance.memory if available (non-standard V8 extension)
    interface PerformanceWithMemory extends Performance {
      memory?: { usedJSHeapSize: number };
    }
    const perf = (typeof performance !== 'undefined' ? performance : undefined) as PerformanceWithMemory | undefined;
    if (perf?.memory && typeof perf.memory.usedJSHeapSize === 'number') {
      return Math.round(perf.memory.usedJSHeapSize / 1024 / 1024); // MB
    }

    // Node.js environment: Use process.memoryUsage if available  
    if (typeof process !== 'undefined' && 
        typeof process.memoryUsage === 'function') {
      const usage = process.memoryUsage();
      return Math.round(usage.heapUsed / 1024 / 1024); // MB
    }

    // React Native: Would require native module implementation
    // For now, return undefined to indicate unavailable
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Sanitize user data for error reporting (remove PII)
 */
export function sanitizeUserData(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const _sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'auth', 'session',
    'email', 'phone', 'address', 'ssn', 'credit', 'card'
  ];

  const sanitized = { ...data };

  for (const key in sanitized) {
    if (_sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive.toLowerCase())
    )) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeUserData(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Check if an error contains sensitive information
 */
export function containsSensitiveInfo(error: Error): boolean {
  const sensitivePatterns = [
    /password/i,
    /token/i,
    /secret/i,
    /key/i,
    /auth/i,
    /session/i,
    /email/i,
    /phone/i,
    /ssn/i,
    /credit.*card/i,
  ];

  const errorString = `${error.message} ${error.stack || ''}`;
  
  return sensitivePatterns.some(pattern => pattern.test(errorString));
}

/**
 * Create error-safe string representation of any value
 */
export function safeStringify(value: unknown, maxLength: number = 1000): string {
  try {
    if (value === null || value === undefined) {
      return String(value);
    }

    if (typeof value === 'string') {
      return value.length > maxLength ? value.slice(0, maxLength) + '...' : value;
    }

    if (typeof value === 'object') {
      // Avoid circular references and limit depth
      const sanitized = sanitizeUserData(value);
      const stringified = JSON.stringify(sanitized, null, 2);
      return stringified.length > maxLength ? 
        stringified.slice(0, maxLength) + '...' : stringified;
    }

    return String(value);
  } catch {
    return '[Error stringifying value]';
  }
}