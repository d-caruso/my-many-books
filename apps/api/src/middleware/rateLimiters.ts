/**
 * Rate Limiter Middleware Instances
 *
 * Creates express-rate-limit middleware instances for different endpoint types.
 */

import rateLimit from 'express-rate-limit';
import { rateLimitConfigs } from '../config/rateLimits';

/**
 * Auth rate limiter (login, register, password reset)
 * Very restrictive: 5 requests per 15 minutes
 */
export const authLimiter = rateLimit({
  windowMs: rateLimitConfigs.auth.windowMs,
  max: rateLimitConfigs.auth.max,
  message: rateLimitConfigs.auth.message,
  standardHeaders: rateLimitConfigs.auth.standardHeaders,
  legacyHeaders: rateLimitConfigs.auth.legacyHeaders,
  skipSuccessfulRequests: rateLimitConfigs.auth.skipSuccessfulRequests,
  skipFailedRequests: rateLimitConfigs.auth.skipFailedRequests,
  // Use IP address as key
  keyGenerator: (req) => {
    return req.ip || 'unknown';
  }
});

/**
 * Standard API rate limiter (authenticated endpoints)
 * Moderate: 1000 requests per hour
 */
export const standardLimiter = rateLimit({
  windowMs: rateLimitConfigs.standard.windowMs,
  max: rateLimitConfigs.standard.max,
  message: rateLimitConfigs.standard.message,
  standardHeaders: rateLimitConfigs.standard.standardHeaders,
  legacyHeaders: rateLimitConfigs.standard.legacyHeaders,
  skipSuccessfulRequests: rateLimitConfigs.standard.skipSuccessfulRequests,
  skipFailedRequests: rateLimitConfigs.standard.skipFailedRequests,
  // Use user ID if authenticated, otherwise IP
  keyGenerator: (req) => {
    const userId = (req as any).user?.id || (req as any).userId;
    return userId || req.ip || 'unknown';
  }
});

/**
 * Admin rate limiter
 * Moderate: 100 requests per 15 minutes
 */
export const adminLimiter = rateLimit({
  windowMs: rateLimitConfigs.admin.windowMs,
  max: rateLimitConfigs.admin.max,
  message: rateLimitConfigs.admin.message,
  standardHeaders: rateLimitConfigs.admin.standardHeaders,
  legacyHeaders: rateLimitConfigs.admin.legacyHeaders,
  skipSuccessfulRequests: rateLimitConfigs.admin.skipSuccessfulRequests,
  skipFailedRequests: rateLimitConfigs.admin.skipFailedRequests,
  // Use user ID for admin endpoints
  keyGenerator: (req) => {
    const userId = (req as any).user?.id || (req as any).userId;
    return userId || req.ip || 'unknown';
  }
});

/**
 * Public/unauthenticated rate limiter
 * Restrictive: 100 requests per hour
 */
export const publicLimiter = rateLimit({
  windowMs: rateLimitConfigs.public.windowMs,
  max: rateLimitConfigs.public.max,
  message: rateLimitConfigs.public.message,
  standardHeaders: rateLimitConfigs.public.standardHeaders,
  legacyHeaders: rateLimitConfigs.public.legacyHeaders,
  skipSuccessfulRequests: rateLimitConfigs.public.skipSuccessfulRequests,
  skipFailedRequests: rateLimitConfigs.public.skipFailedRequests,
  // Use IP address for public endpoints
  keyGenerator: (req) => {
    return req.ip || 'unknown';
  }
});

/**
 * Search rate limiter
 * Moderate: 100 searches per 15 minutes
 */
export const searchLimiter = rateLimit({
  windowMs: rateLimitConfigs.search.windowMs,
  max: rateLimitConfigs.search.max,
  message: rateLimitConfigs.search.message,
  standardHeaders: rateLimitConfigs.search.standardHeaders,
  legacyHeaders: rateLimitConfigs.search.legacyHeaders,
  skipSuccessfulRequests: rateLimitConfigs.search.skipSuccessfulRequests,
  skipFailedRequests: rateLimitConfigs.search.skipFailedRequests,
  // Use user ID if authenticated, otherwise IP
  keyGenerator: (req) => {
    const userId = (req as any).user?.id || (req as any).userId;
    return userId || req.ip || 'unknown';
  }
});
