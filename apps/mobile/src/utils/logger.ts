/**
 * Simple logger utility for development
 * Replace with proper logging library in production
 */
export const logger = {
  info: (message: string, ...args: unknown[]) => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  
  error: (message: string, error?: unknown) => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error(`[ERROR] ${message}`, error);
    }
  },
  
  warn: (message: string, ...args: unknown[]) => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  
  debug: (message: string, ...args: unknown[]) => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
};