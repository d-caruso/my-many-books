/**
 * Rate Limiting Configuration
 *
 * Defines rate limit settings for different endpoint types.
 * Uses express-rate-limit library.
 */

import { i18n } from '@my-many-books/shared-i18n';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message: string; // Custom error message
  standardHeaders: boolean; // Return rate limit info in RateLimit-* headers
  legacyHeaders: boolean; // Return rate limit info in X-RateLimit-* headers
  skipSuccessfulRequests: boolean; // Don't count successful requests
  skipFailedRequests: boolean; // Don't count failed requests
}

/**
 * Environment-based configuration
 */
const isDevelopment = process.env['NODE_ENV'] === 'development';

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
    message: i18n.t('errors.rate_limit_auth'),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  /**
   * Standard API endpoints (authenticated users)
   * Moderate limits for normal operations
   */
  standard: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isDevelopment ? 10000 : 1000, // 1000 requests per hour in prod
    message: i18n.t('errors.rate_limit_standard'),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  /**
   * Admin endpoints
   * Moderate limits with tighter window
   */
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 1000 : 100, // 100 requests per 15min in prod
    message: i18n.t('errors.rate_limit_admin'),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  /**
   * Public/unauthenticated endpoints
   * More restrictive to prevent abuse
   */
  public: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isDevelopment ? 1000 : 100, // 100 requests per hour in prod
    message: i18n.t('errors.rate_limit_public'),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  /**
   * Search endpoints
   * Moderate limits to prevent scraping
   */
  search: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 1000 : 100, // 100 searches per 15min in prod
    message: i18n.t('errors.rate_limit_search'),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  /**
   * Write operations (POST, PUT, PATCH, DELETE)
   * More restrictive than read operations
   */
  write: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isDevelopment ? 5000 : 500, // 500 write operations per hour in prod
    message: i18n.t('errors.rate_limit_write'),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  /**
   * Read operations (GET)
   * More permissive than write operations
   */
  read: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isDevelopment ? 20000 : 2000, // 2000 read operations per hour in prod
    message: i18n.t('errors.rate_limit_read'),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
};

/**
 * Helper to get rate limit config by type
 */
export function getRateLimitConfig(type: keyof typeof rateLimitConfigs): RateLimitConfig {
  return rateLimitConfigs[type];
}
