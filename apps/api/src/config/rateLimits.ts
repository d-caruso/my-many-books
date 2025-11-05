/**
 * Rate Limiting Configuration
 *
 * Defines rate limit settings for different endpoint types.
 * Uses express-rate-limit library.
 */

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  max: number;       // Max requests per window
  message?: string;  // Custom error message
  standardHeaders?: boolean;  // Return rate limit info in RateLimit-* headers
  legacyHeaders?: boolean;    // Return rate limit info in X-RateLimit-* headers
  skipSuccessfulRequests?: boolean;  // Don't count successful requests
  skipFailedRequests?: boolean;      // Don't count failed requests
}

/**
 * Environment-based configuration
 */
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Rate limit configurations for different endpoint types
 */
export const rateLimitConfigs = {
  /**
   * Auth endpoints (login, register, password reset)
   * Very restrictive to prevent brute force attacks
   */
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 100 : 5, // 5 requests per 15min in prod, 100 in dev
    message: {
      error: 'Too many authentication attempts. Please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  } as RateLimitConfig,

  /**
   * Standard API endpoints (authenticated users)
   * Moderate limits for normal operations
   */
  standard: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isDevelopment ? 10000 : 1000, // 1000 requests per hour in prod
    message: {
      error: 'Too many requests. Please try again later.',
      retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  } as RateLimitConfig,

  /**
   * Admin endpoints
   * Moderate limits with tighter window
   */
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 1000 : 100, // 100 requests per 15min in prod
    message: {
      error: 'Too many admin requests. Please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  } as RateLimitConfig,

  /**
   * Public/unauthenticated endpoints
   * More restrictive to prevent abuse
   */
  public: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isDevelopment ? 1000 : 100, // 100 requests per hour in prod
    message: {
      error: 'Too many requests from this IP. Please try again later.',
      retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  } as RateLimitConfig,

  /**
   * Search endpoints
   * Moderate limits to prevent scraping
   */
  search: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 1000 : 100, // 100 searches per 15min in prod
    message: {
      error: 'Too many search requests. Please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  } as RateLimitConfig
};

/**
 * Helper to get rate limit config by type
 */
export function getRateLimitConfig(type: keyof typeof rateLimitConfigs): RateLimitConfig {
  return rateLimitConfigs[type];
}
