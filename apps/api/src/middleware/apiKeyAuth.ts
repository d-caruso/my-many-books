// ================================================================
// src/middleware/apiKeyAuth.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { i18n } from '@my-many-books/shared-i18n';
import { ERROR_CODES, createErrorResponse, type ErrorCode } from '@my-many-books/shared-types';

export interface ApiKeyConfig {
  enabled: boolean;
  headerName: string;
  validKeys: Set<string>;
  keyTiers: Map<string, ApiKeyTier>;
}

export interface ApiKeyTier {
  name: string;
  rateLimit: number; // requests per minute
  quotaLimit: number; // requests per month
  permissions: string[];
}

export class ApiKeyAuthenticator {
  private config: ApiKeyConfig;
  private usageTracker: Map<string, ApiKeyUsage> = new Map();

  constructor(config: ApiKeyConfig) {
    this.config = config;
  }

  public authenticate(event: APIGatewayProxyEvent): AuthenticationResult {
    if (!this.config.enabled) {
      return { isAuthenticated: true, tier: 'none' };
    }

    const apiKey = this.extractApiKey(event);
    if (!apiKey) {
      return {
        isAuthenticated: false,
        error: 'API key is required',
        errorCode: ERROR_CODES.API_KEY_MISSING,
        statusCode: 401,
      };
    }

    if (!this.config.validKeys.has(apiKey)) {
      return {
        isAuthenticated: false,
        error: 'Invalid API key',
        errorCode: ERROR_CODES.API_KEY_INVALID,
        statusCode: 401,
      };
    }

    const tier = this.config.keyTiers.get(apiKey);
    if (!tier) {
      return {
        isAuthenticated: false,
        error: 'API key tier not found',
        errorCode: ERROR_CODES.API_KEY_TIER_NOT_FOUND,
        statusCode: 500,
      };
    }

    // Check rate limits and quotas
    const usageCheck = this.checkUsageLimits(apiKey, tier);
    if (!usageCheck.allowed) {
      return {
        isAuthenticated: false,
        error: usageCheck.error || 'Usage limit exceeded',
        errorCode: usageCheck.errorCode || ERROR_CODES.USAGE_LIMIT_EXCEEDED,
        statusCode: 429,
        retryAfter: usageCheck.retryAfter || 60,
      };
    }

    // Update usage
    this.updateUsage(apiKey);

    return {
      isAuthenticated: true,
      tier: tier.name,
      apiKey,
      permissions: tier.permissions,
    };
  }

  private extractApiKey(event: APIGatewayProxyEvent): string | null {
    const headers = event.headers || {};
    const headerName = this.config.headerName;

    // Check both original case and lowercase
    return headers[headerName] || headers[headerName.toLowerCase()] || headers[`x-api-key`] || null;
  }

  private checkUsageLimits(apiKey: string, tier: ApiKeyTier): UsageCheckResult {
    const usage = this.getOrCreateUsage(apiKey);
    const now = Date.now();

    // Check rate limit (per minute)
    const minuteWindow = 60 * 1000;
    const minuteStart = now - minuteWindow;

    // Clean old requests
    usage.requests = usage.requests.filter(timestamp => timestamp > minuteStart);

    if (usage.requests.length >= tier.rateLimit) {
      const oldestRequest = Math.min(...usage.requests);
      const retryAfter = Math.ceil((oldestRequest + minuteWindow - now) / 1000);

      return {
        allowed: false,
        error: 'Rate limit exceeded',
        errorCode: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        retryAfter,
        details: { limit: tier.rateLimit, windowSeconds: 60 },
      };
    }

    // Check monthly quota
    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlyRequests = usage.requests.filter(
      timestamp => timestamp >= monthStart.getTime()
    ).length;

    if (monthlyRequests >= tier.quotaLimit) {
      const nextMonth = new Date(monthStart);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const retryAfter = Math.ceil((nextMonth.getTime() - now) / 1000);

      return {
        allowed: false,
        error: 'Monthly quota exceeded',
        errorCode: ERROR_CODES.QUOTA_EXCEEDED,
        retryAfter,
        details: { limit: tier.quotaLimit },
      };
    }

    return { allowed: true };
  }

  private updateUsage(apiKey: string): void {
    const usage = this.getOrCreateUsage(apiKey);
    usage.requests.push(Date.now());
    usage.lastUsed = new Date();
  }

  private getOrCreateUsage(apiKey: string): ApiKeyUsage {
    if (!this.usageTracker.has(apiKey)) {
      this.usageTracker.set(apiKey, {
        apiKey,
        requests: [],
        lastUsed: new Date(),
        createdAt: new Date(),
      });
    }
    return this.usageTracker.get(apiKey)!;
  }

  public getUsageStats(apiKey: string): ApiKeyUsageStats | null {
    const usage = this.usageTracker.get(apiKey);
    if (!usage) return null;

    const now = Date.now();
    const minuteWindow = 60 * 1000;
    const dayWindow = 24 * 60 * 60 * 1000;
    const monthWindow = 30 * dayWindow;

    return {
      apiKey,
      requestsLastMinute: usage.requests.filter(t => t > now - minuteWindow).length,
      requestsLastDay: usage.requests.filter(t => t > now - dayWindow).length,
      requestsLastMonth: usage.requests.filter(t => t > now - monthWindow).length,
      lastUsed: usage.lastUsed,
      totalRequests: usage.requests.length,
    };
  }
}

export interface AuthenticationResult {
  isAuthenticated: boolean;
  tier?: string;
  apiKey?: string;
  permissions?: string[];
  error?: string;
  errorCode?: ErrorCode;
  statusCode?: number;
  retryAfter?: number;
}

export interface UsageCheckResult {
  allowed: boolean;
  error?: string;
  errorCode?: ErrorCode;
  retryAfter?: number;
  details?: Record<string, unknown>;
}

export interface ApiKeyUsage {
  apiKey: string;
  requests: number[];
  lastUsed: Date;
  createdAt: Date;
}

export interface ApiKeyUsageStats {
  apiKey: string;
  requestsLastMinute: number;
  requestsLastDay: number;
  requestsLastMonth: number;
  lastUsed: Date;
  totalRequests: number;
}

// Middleware wrapper
export const withApiKeyAuth = (
  handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>,
  authenticator: ApiKeyAuthenticator
) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const authResult = authenticator.authenticate(event);

    if (!authResult.isAuthenticated) {
      const response: APIGatewayProxyResult = {
        statusCode: authResult.statusCode || 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          ...(authResult.retryAfter && { 'Retry-After': authResult.retryAfter.toString() }),
        },
        body: JSON.stringify(
          createErrorResponse(
            authResult.errorCode || ERROR_CODES.AUTH_FAILED,
            i18n.t('errors:auth_failed')
          )
        ),
      };
      return response;
    }

    // Add authentication context to event
    (event as APIGatewayProxyEvent & { authContext: unknown }).authContext = {
      tier: authResult.tier,
      apiKey: authResult.apiKey,
      permissions: authResult.permissions || [],
    };

    return handler(event);
  };
};
