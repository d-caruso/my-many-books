import {
  validateActionConfig,
  safeValidateActionConfig,
  validateEventPattern,
  LogActionConfigSchema,
  EmailActionConfigSchema,
  DatabaseActionConfigSchema,
} from '../validation';
import { ZodError } from 'zod';

describe('LogActionConfigSchema', () => {
  it('validates valid log config with prefix', () => {
    const config = { prefix: 'app' };
    expect(() => LogActionConfigSchema.parse(config)).not.toThrow();
  });

  it('validates valid log config with level', () => {
    const config = { level: 'info' as const };
    expect(() => LogActionConfigSchema.parse(config)).not.toThrow();
  });

  it('validates empty log config', () => {
    const config = {};
    expect(() => LogActionConfigSchema.parse(config)).not.toThrow();
  });

  it('rejects invalid log level', () => {
    const config = { level: 'invalid' };
    expect(() => LogActionConfigSchema.parse(config)).toThrow(ZodError);
  });

  it('rejects extra fields in strict mode', () => {
    const config = { prefix: 'app', extraField: 'value' };
    expect(() => LogActionConfigSchema.parse(config)).toThrow(ZodError);
  });
});

describe('EmailActionConfigSchema', () => {
  it('validates valid email config with single recipient', () => {
    const config = {
      to: 'user@example.com',
      subject: 'Test',
      template: 'Hello {{name}}',
    };
    expect(() => EmailActionConfigSchema.parse(config)).not.toThrow();
  });

  it('validates valid email config with multiple recipients', () => {
    const config = {
      to: ['user1@example.com', 'user2@example.com'],
      subject: 'Test',
      template: 'Hello',
    };
    expect(() => EmailActionConfigSchema.parse(config)).not.toThrow();
  });

  it('validates email config with cc and bcc', () => {
    const config = {
      to: 'user@example.com',
      cc: 'cc@example.com',
      bcc: ['bcc1@example.com', 'bcc2@example.com'],
      subject: 'Test',
      template: 'Body',
      from: 'sender@example.com',
    };
    expect(() => EmailActionConfigSchema.parse(config)).not.toThrow();
  });

  it('rejects invalid email address', () => {
    const config = {
      to: 'invalid-email',
      subject: 'Test',
      template: 'Body',
    };
    expect(() => EmailActionConfigSchema.parse(config)).toThrow(ZodError);
  });

  it('rejects missing subject', () => {
    const config = {
      to: 'user@example.com',
      template: 'Body',
    };
    expect(() => EmailActionConfigSchema.parse(config)).toThrow(ZodError);
  });

  it('rejects empty subject', () => {
    const config = {
      to: 'user@example.com',
      subject: '',
      template: 'Body',
    };
    expect(() => EmailActionConfigSchema.parse(config)).toThrow(ZodError);
  });

  it('rejects missing template', () => {
    const config = {
      to: 'user@example.com',
      subject: 'Test',
    };
    expect(() => EmailActionConfigSchema.parse(config)).toThrow(ZodError);
  });
});

describe('DatabaseActionConfigSchema', () => {
  it('validates valid create operation', () => {
    const config = {
      operation: 'create' as const,
      table: 'users',
      data: { name: 'John', email: 'john@example.com' },
    };
    expect(() => DatabaseActionConfigSchema.parse(config)).not.toThrow();
  });

  it('validates valid update operation', () => {
    const config = {
      operation: 'update' as const,
      table: 'users',
      data: { name: 'Jane' },
      where: { id: 1 },
    };
    expect(() => DatabaseActionConfigSchema.parse(config)).not.toThrow();
  });

  it('validates valid delete operation', () => {
    const config = {
      operation: 'delete' as const,
      table: 'users',
      where: { id: 1 },
    };
    expect(() => DatabaseActionConfigSchema.parse(config)).not.toThrow();
  });

  it('rejects create without data', () => {
    const config = {
      operation: 'create' as const,
      table: 'users',
    };
    expect(() => DatabaseActionConfigSchema.parse(config)).toThrow(ZodError);
  });

  it('rejects create with empty data', () => {
    const config = {
      operation: 'create' as const,
      table: 'users',
      data: {},
    };
    expect(() => DatabaseActionConfigSchema.parse(config)).toThrow(ZodError);
  });

  it('rejects update without where clause', () => {
    const config = {
      operation: 'update' as const,
      table: 'users',
      data: { name: 'Jane' },
    };
    expect(() => DatabaseActionConfigSchema.parse(config)).toThrow(ZodError);
  });

  it('rejects update without data', () => {
    const config = {
      operation: 'update' as const,
      table: 'users',
      where: { id: 1 },
    };
    expect(() => DatabaseActionConfigSchema.parse(config)).toThrow(ZodError);
  });

  it('rejects delete without where clause', () => {
    const config = {
      operation: 'delete' as const,
      table: 'users',
    };
    expect(() => DatabaseActionConfigSchema.parse(config)).toThrow(ZodError);
  });

  it('rejects invalid operation', () => {
    const config = {
      operation: 'invalid',
      table: 'users',
    };
    expect(() => DatabaseActionConfigSchema.parse(config)).toThrow(ZodError);
  });

  it('rejects missing table', () => {
    const config = {
      operation: 'create' as const,
      data: { name: 'John' },
    };
    expect(() => DatabaseActionConfigSchema.parse(config)).toThrow(ZodError);
  });
});

describe('validateActionConfig', () => {
  it('validates log action config', () => {
    const config = { prefix: 'test' };
    expect(validateActionConfig('log', config)).toBe(true);
  });

  it('validates email action config', () => {
    const config = {
      to: 'user@example.com',
      subject: 'Test',
      template: 'Body',
    };
    expect(validateActionConfig('email', config)).toBe(true);
  });

  it('validates database action config', () => {
    const config = {
      operation: 'create' as const,
      table: 'users',
      data: { name: 'John' },
    };
    expect(validateActionConfig('database', config)).toBe(true);
  });

  it('throws error for unknown action type', () => {
    const config = { test: 'value' };
    expect(() => validateActionConfig('unknown', config)).toThrow('Unknown action type: unknown');
  });

  it('throws ZodError for invalid config', () => {
    const config = { level: 'invalid' };
    expect(() => validateActionConfig('log', config)).toThrow(ZodError);
  });
});

describe('safeValidateActionConfig', () => {
  it('returns success for valid config', () => {
    const config = { prefix: 'test' };
    const result = safeValidateActionConfig('log', config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(config);
    }
  });

  it('returns error for invalid config', () => {
    const config = { level: 'invalid' };
    const result = safeValidateActionConfig('log', config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
    }
  });

  it('returns error for unknown action type', () => {
    const config = { test: 'value' };
    const result = safeValidateActionConfig('unknown', config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Unknown action type');
    }
  });
});

describe('validateEventPattern', () => {
  it('validates simple event pattern', () => {
    expect(validateEventPattern('user.created')).toBe(true);
  });

  it('validates wildcard pattern', () => {
    expect(validateEventPattern('user.*')).toBe(true);
  });

  it('validates double wildcard pattern', () => {
    expect(validateEventPattern('**')).toBe(true);
  });

  it('validates multi-level wildcard', () => {
    expect(validateEventPattern('book.*.*')).toBe(true);
  });

  it('validates pattern with underscores', () => {
    expect(validateEventPattern('user_auth.login')).toBe(true);
  });

  it('validates pattern with hyphens', () => {
    expect(validateEventPattern('user-auth.login')).toBe(true);
  });

  it('validates complex valid pattern', () => {
    expect(validateEventPattern('app.user-service.auth_events.*')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(() => validateEventPattern('')).toThrow('Event pattern cannot be empty');
  });

  it('rejects whitespace-only string', () => {
    expect(() => validateEventPattern('   ')).toThrow('Event pattern cannot be empty');
  });

  it('rejects null', () => {
    expect(() => validateEventPattern(null as any)).toThrow('Event pattern must be a non-empty string');
  });

  it('rejects undefined', () => {
    expect(() => validateEventPattern(undefined as any)).toThrow('Event pattern must be a non-empty string');
  });

  it('rejects excessive wildcards (ReDoS)', () => {
    expect(() => validateEventPattern('***')).toThrow('potentially dangerous pattern');
  });

  it('rejects excessive .* pattern (ReDoS)', () => {
    expect(() => validateEventPattern('.*.*.*.*.*')).toThrow('potentially dangerous pattern');
  });

  it('rejects invalid characters (spaces)', () => {
    expect(() => validateEventPattern('user created')).toThrow('invalid characters');
  });

  it('rejects invalid characters (special chars)', () => {
    expect(() => validateEventPattern('user@created')).toThrow('invalid characters');
    expect(() => validateEventPattern('user#created')).toThrow('invalid characters');
    expect(() => validateEventPattern('user/created')).toThrow('invalid characters');
  });

  it('rejects excessively long pattern', () => {
    const longPattern = 'a'.repeat(201);
    expect(() => validateEventPattern(longPattern)).toThrow('too long');
  });

  it('accepts pattern at max length (200 chars)', () => {
    const maxPattern = 'a'.repeat(200);
    expect(validateEventPattern(maxPattern)).toBe(true);
  });
});
