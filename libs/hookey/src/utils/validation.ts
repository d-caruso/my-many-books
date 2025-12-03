import { z } from 'zod';

/**
 * Validation schemas for different action types
 */

// Log Action Configuration Schema
export const LogActionConfigSchema = z.object({
  prefix: z.string().optional(),
  level: z.enum(['info', 'warn', 'error', 'debug']).optional(),
}).strict();

// Email Action Configuration Schema
export const EmailActionConfigSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  subject: z.string().min(1),
  template: z.string().min(1),
  from: z.string().email().optional(),
}).strict();

// Database Action Configuration Schema
export const DatabaseActionConfigSchema = z.object({
  operation: z.enum(['create', 'update', 'delete']),
  table: z.string().min(1),
  data: z.record(z.string(), z.any()).optional(),
  where: z.record(z.string(), z.any()).optional(),
}).strict().refine(
  (data) => {
    // 'create' and 'update' require 'data'
    if (data.operation === 'create' || data.operation === 'update') {
      return data.data !== undefined && Object.keys(data.data).length > 0;
    }
    return true;
  },
  { message: "Operation 'create' and 'update' require 'data' field" }
).refine(
  (data) => {
    // 'update' and 'delete' require 'where'
    if (data.operation === 'update' || data.operation === 'delete') {
      return data.where !== undefined && Object.keys(data.where).length > 0;
    }
    return true;
  },
  { message: "Operation 'update' and 'delete' require 'where' field" }
);

// Map of action types to their validation schemas
export const ActionConfigSchemas = {
  log: LogActionConfigSchema,
  email: EmailActionConfigSchema,
  database: DatabaseActionConfigSchema,
} as const;

export type ActionType = keyof typeof ActionConfigSchemas;

/**
 * Validate action configuration based on action type
 * @param actionType - The type of action (log, email, database)
 * @param config - The configuration object to validate
 * @returns true if valid
 * @throws ZodError if validation fails
 */
export function validateActionConfig(actionType: string, config: unknown): boolean {
  const schema = ActionConfigSchemas[actionType as ActionType];

  if (!schema) {
    throw new Error(`Unknown action type: ${actionType}`);
  }

  // This will throw ZodError if validation fails
  schema.parse(config);

  return true;
}

/**
 * Safely validate action configuration without throwing
 * @param actionType - The type of action (log, email, database)
 * @param config - The configuration object to validate
 * @returns Success result with data or failure with error
 */
export function safeValidateActionConfig(actionType: string, config: unknown) {
  const schema = ActionConfigSchemas[actionType as ActionType];

  if (!schema) {
    return {
      success: false as const,
      error: new Error(`Unknown action type: ${actionType}`),
    };
  }

  return schema.safeParse(config);
}

/**
 * Validate event pattern for ReDoS and malicious patterns
 * @param eventPattern - The event pattern to validate
 * @returns true if valid
 * @throws Error if pattern is invalid
 */
export function validateEventPattern(eventPattern: string): boolean {
  if (typeof eventPattern !== 'string') {
    throw new Error('Event pattern must be a non-empty string');
  }

  if (eventPattern.length === 0 || eventPattern.trim().length === 0) {
    throw new Error('Event pattern cannot be empty');
  }

  // Check for excessive repetition or nesting (ReDoS prevention)
  const dangerousPatterns = [
    /(\*{3,})/,                    // More than 2 consecutive wildcards
    /(\.\*){5,}/,                  // More than 4 consecutive .*
    /(\w+\*){10,}/,                // Excessive wildcards
    /([\[\(].*[\]\)]){5,}/,        // Excessive grouping
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(eventPattern)) {
      throw new Error('Event pattern contains potentially dangerous pattern (ReDoS risk)');
    }
  }

  // Check for valid characters (alphanumeric, dots, asterisks, underscores, hyphens)
  const validCharsPattern = /^[a-zA-Z0-9.*_-]+$/;
  if (!validCharsPattern.test(eventPattern)) {
    throw new Error('Event pattern contains invalid characters. Only alphanumeric, dots, asterisks, underscores, and hyphens are allowed');
  }

  // Check pattern length (prevent excessively long patterns)
  if (eventPattern.length > 200) {
    throw new Error('Event pattern is too long (max 200 characters)');
  }

  return true;
}
