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
  } catch (error) {
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
  } catch (error) {
    return `${Platform.OS}/unknown MyManyBooks/unknown`;
  }
}

/**
 * Get app version information
 */
export async function getAppVersion(): Promise<string> {
  try {
    // In a real app, this could be imported from package.json or app config
    return '1.0.0 (1)';
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Get memory usage information (if available)
 */
export async function getMemoryUsage(): Promise<number | undefined> {
  try {
    // React Native doesn't provide direct memory APIs
    // This would need to be implemented with native modules if needed
    return undefined;
  } catch (error) {
    return undefined;
  }
}

/**
 * Sanitize user data for error reporting (remove PII)
 */
export function sanitizeUserData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'auth', 'session',
    'email', 'phone', 'address', 'ssn', 'credit', 'card'
  ];

  const sanitized = { ...data };

  for (const key in sanitized) {
    if (sanitiveKeys.some(sensitive => 
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
export function safeStringify(value: any, maxLength: number = 1000): string {
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
  } catch (error) {
    return '[Error stringifying value]';
  }
}