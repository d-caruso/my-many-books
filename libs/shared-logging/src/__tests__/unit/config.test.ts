/**
 * Unit tests for configuration
 */

import {
  createPinoConfig,
  getLogLevel,
  getEnvironment,
  errorSerializer,
  requestSerializer,
  responseSerializer,
} from '../../config/pinoConfig';
import {
  shouldRedact,
  REDACTED_FIELDS,
  redactionConfig,
} from '../../config/redactionRules';

describe('Pino Configuration', () => {
  describe('getEnvironment', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should return development by default', () => {
      delete process.env.NODE_ENV;
      expect(getEnvironment()).toBe('development');
    });

    it('should return NODE_ENV when valid', () => {
      process.env.NODE_ENV = 'production';
      expect(getEnvironment()).toBe('production');

      process.env.NODE_ENV = 'test';
      expect(getEnvironment()).toBe('test');

      process.env.NODE_ENV = 'staging';
      expect(getEnvironment()).toBe('staging');
    });

    it('should return development for invalid NODE_ENV', () => {
      process.env.NODE_ENV = 'invalid';
      expect(getEnvironment()).toBe('development');
    });
  });

  describe('getLogLevel', () => {
    const originalLogLevel = process.env.LOG_LEVEL;

    afterEach(() => {
      if (originalLogLevel === undefined) {
        delete process.env.LOG_LEVEL;
      } else {
        process.env.LOG_LEVEL = originalLogLevel;
      }
    });

    it('should return correct default levels for each environment', () => {
      expect(getLogLevel('development')).toBe('debug');
      expect(getLogLevel('test')).toBe('error');
      expect(getLogLevel('staging')).toBe('info');
      expect(getLogLevel('production')).toBe('warn');
    });

    it('should respect LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'fatal';
      expect(getLogLevel('development')).toBe('fatal');
      expect(getLogLevel('production')).toBe('fatal');
    });
  });

  describe('errorSerializer', () => {
    it('should serialize error with message and stack', () => {
      const error = new Error('Test error');
      const serialized = errorSerializer(error);

      expect(serialized).toHaveProperty('type', 'Error');
      expect(serialized).toHaveProperty('message', 'Test error');
      expect(serialized).toHaveProperty('stack');
      expect(serialized.stack).toContain('Test error');
    });

    it('should include custom error properties', () => {
      const error: any = new Error('Test error');
      error.code = 'TEST_CODE';
      error.statusCode = 500;

      const serialized = errorSerializer(error);

      expect(serialized).toHaveProperty('code', 'TEST_CODE');
      expect(serialized).toHaveProperty('statusCode', 500);
    });
  });

  describe('requestSerializer', () => {
    it('should serialize Express request', () => {
      const mockReq = {
        id: 'req-123',
        method: 'POST',
        url: '/api/test',
        path: '/api/test',
        params: { id: '456' },
        query: { search: 'query' },
        headers: {
          host: 'localhost:3000',
          'user-agent': 'test-agent',
          'content-type': 'application/json',
          authorization: 'Bearer secret-token',
        },
        ip: '127.0.0.1',
      };

      const serialized = requestSerializer(mockReq);

      expect(serialized).toHaveProperty('method', 'POST');
      expect(serialized).toHaveProperty('url', '/api/test');
      expect(serialized).toHaveProperty('params', { id: '456' });
      expect(serialized).toHaveProperty('query', { search: 'query' });
      expect(serialized.headers).toHaveProperty('host', 'localhost:3000');
      expect(serialized.headers).toHaveProperty('user-agent', 'test-agent');
      // Should not include authorization header
      expect(serialized.headers).not.toHaveProperty('authorization');
    });
  });

  describe('responseSerializer', () => {
    it('should serialize Express response', () => {
      const mockRes = {
        statusCode: 200,
        headers: {
          'content-type': 'application/json',
          'content-length': '1234',
        },
      };

      const serialized = responseSerializer(mockRes);

      expect(serialized).toHaveProperty('statusCode', 200);
      expect(serialized.headers).toHaveProperty(
        'content-type',
        'application/json'
      );
      expect(serialized.headers).toHaveProperty('content-length', '1234');
    });
  });

  describe('createPinoConfig', () => {
    it('should create config for development', () => {
      const config = createPinoConfig('development');

      expect(config.level).toBe('debug');
      expect(config.base).toHaveProperty('environment', 'development');
      expect(config).toHaveProperty('transport'); // Pretty print in dev
    });

    it('should create config for production', () => {
      const config = createPinoConfig('production');

      expect(config.level).toBe('warn');
      expect(config.base).toHaveProperty('environment', 'production');
      expect(config).not.toHaveProperty('transport'); // No pretty print
    });

    it('should include redaction config', () => {
      const config = createPinoConfig('production');

      expect(config).toHaveProperty('redact');
      expect(config.redact).toEqual(redactionConfig);
    });

    it('should include serializers', () => {
      const config = createPinoConfig('production');

      expect(config.serializers).toHaveProperty('err', errorSerializer);
      expect(config.serializers).toHaveProperty('error', errorSerializer);
      expect(config.serializers).toHaveProperty('req', requestSerializer);
      expect(config.serializers).toHaveProperty('res', responseSerializer);
    });
  });
});

describe('Redaction Rules', () => {
  describe('REDACTED_FIELDS', () => {
    it('should include sensitive authentication fields', () => {
      expect(REDACTED_FIELDS).toContain('password');
      expect(REDACTED_FIELDS).toContain('token');
      expect(REDACTED_FIELDS).toContain('apiKey');
      expect(REDACTED_FIELDS).toContain('secret');
    });

    it('should include PII fields', () => {
      expect(REDACTED_FIELDS).toContain('ssn');
      expect(REDACTED_FIELDS).toContain('creditCard');
      expect(REDACTED_FIELDS).toContain('email');
      expect(REDACTED_FIELDS).toContain('phone');
    });
  });

  describe('shouldRedact', () => {
    it('should detect fields that should be redacted', () => {
      expect(shouldRedact('password')).toBe(true);
      expect(shouldRedact('userPassword')).toBe(true);
      expect(shouldRedact('apiKey')).toBe(true);
      expect(shouldRedact('myApiKey')).toBe(true);
      expect(shouldRedact('accessToken')).toBe(true);
    });

    it('should handle case-insensitive matching', () => {
      expect(shouldRedact('PASSWORD')).toBe(true);
      expect(shouldRedact('ApiKey')).toBe(true);
      expect(shouldRedact('SECRET_KEY')).toBe(true);
    });

    it('should not redact safe fields', () => {
      expect(shouldRedact('username')).toBe(false);
      expect(shouldRedact('userId')).toBe(false);
      expect(shouldRedact('name')).toBe(false);
      expect(shouldRedact('createdAt')).toBe(false);
    });
  });

  describe('redactionConfig', () => {
    it('should have correct structure', () => {
      expect(redactionConfig).toHaveProperty('paths');
      expect(redactionConfig).toHaveProperty('censor', '[REDACTED]');
      expect(redactionConfig).toHaveProperty('remove', false);
    });

    it('should include all sensitive fields in paths', () => {
      expect(redactionConfig.paths).toEqual(REDACTED_FIELDS);
    });
  });
});
