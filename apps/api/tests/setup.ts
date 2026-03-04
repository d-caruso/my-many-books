import 'reflect-metadata';
import { config } from 'dotenv';
import { initializeI18n } from '@my-many-books/shared-i18n';

// Load test environment variables
config({ path: '.env.test' });

// Mock rate limiters — prevents 429 errors from exhausting test quotas
jest.mock('../src/middleware/rateLimiters', () => {
  const passThrough = (_req: unknown, _res: unknown, next: () => void) => next();
  return {
    authLimiter: passThrough,
    standardLimiter: passThrough,
    adminLimiter: passThrough,
    publicLimiter: passThrough,
    searchLimiter: passThrough,
    writeLimiter: passThrough,
    readLimiter: passThrough,
  };
});

// Mock AWS SDK
jest.mock('aws-sdk', () => ({
  RDS: jest.fn().mockImplementation(() => ({
    startDBInstance: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ DBInstance: { DBInstanceStatus: 'starting' } }),
    }),
    stopDBInstance: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ DBInstance: { DBInstanceStatus: 'stopping' } }),
    }),
  })),
}));

// Global test setup
beforeAll(async () => {
  // Initialize i18n with English for tests
  await initializeI18n('en');
});

afterAll(async () => {
  // Cleanup test resources
});
