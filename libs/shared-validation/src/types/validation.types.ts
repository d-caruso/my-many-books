/**
 * Validation Type Definitions
 *
 * Type-safe interfaces for validation results and errors.
 */

/**
 * Result of a validation operation
 */
export interface ValidationResult<T = unknown> {
  /** Whether the validation passed */
  isValid: boolean;

  /** The validated and normalized value (if valid) */
  value?: T;

  /** Error message if validation failed */
  error?: string;

  /** Error code for programmatic handling */
  errorCode?: string;

  /** i18n key for translatable error messages */
  i18nKey?: string;

  /** Additional validation metadata */
  metadata?: Record<string, unknown>;
}

/**
 * ISBN-specific validation result
 */
export interface IsbnValidationResult {
  /** Whether the ISBN is valid */
  isValid: boolean;

  /** Normalized ISBN (without hyphens/spaces, uppercase) */
  normalizedIsbn?: string;

  /** Original ISBN format detected */
  format?: 'ISBN-10' | 'ISBN-13';

  /** Error message if validation failed */
  error?: string;

  /** Error code for programmatic handling */
  errorCode?: string;

  /** i18n key for translatable error messages */
  i18nKey?: string;
}

/**
 * Validation error details
 */
export interface ValidationError {
  /** Field that failed validation */
  field: string;

  /** Error message */
  message: string;

  /** Error code for i18n */
  code?: string;

  /** Actual value that failed */
  value?: unknown;

  /** Expected value or constraint */
  constraint?: unknown;
}

/**
 * Collection of validation errors
 */
export interface ValidationErrors {
  /** Whether validation failed */
  hasErrors: boolean;

  /** List of validation errors */
  errors: ValidationError[];

  /** Total number of errors */
  count: number;
}

/**
 * Validation context for different scenarios
 */
export type ValidationContext =
  | 'user-create'
  | 'user-update'
  | 'admin-create'
  | 'admin-update'
  | 'progressive'
  | 'final';

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Validation context (determines strictness) */
  context?: ValidationContext;

  /** Stop on first error (default: false) */
  abortEarly?: boolean;

  /** Strip unknown fields (default: true) */
  stripUnknown?: boolean;

  /** Allow undefined values (default: false) */
  allowUndefined?: boolean;

  /** Custom error messages */
  messages?: Record<string, string>;
}

/**
 * Field validation constraint
 */
export interface FieldConstraint<T = unknown> {
  /** Whether field is required */
  required?: boolean;

  /** Minimum value/length */
  min?: number;

  /** Maximum value/length */
  max?: number;

  /** Regex pattern */
  pattern?: RegExp;

  /** Custom validator function */
  validator?: (value: T) => boolean | ValidationResult<T>;

  /** Error message */
  message?: string;
}

/**
 * Schema definition for an entity
 */
export type ValidationSchema<T = Record<string, unknown>> = {
  [K in keyof T]?: FieldConstraint<T[K]>;
};
