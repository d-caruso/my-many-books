/**
 * PII Redaction rules for logging
 *
 * Automatically redacts sensitive data from logs to prevent
 * accidental PII leakage and maintain GDPR compliance.
 */

/**
 * List of fields that should be completely redacted from logs
 */
export const REDACTED_FIELDS = [
  // Authentication & Security
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'privateKey',
  'private_key',
  'authorization',
  'cookie',
  'cookies',
  'session',
  'sessionId',
  'session_id',

  // Personal Information
  'ssn',
  'social_security_number',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'pin',
  'passport',
  'driverLicense',
  'driver_license',

  // Potentially Sensitive
  'email',
  'phone',
  'phoneNumber',
  'phone_number',
  'address',
  'ipAddress',
  'ip_address',
];

/**
 * Pino redaction configuration
 *
 * Uses Pino's built-in redaction feature to remove sensitive fields
 */
export const redactionConfig = {
  paths: REDACTED_FIELDS,
  censor: '[REDACTED]',
  remove: false, // Keep the field name but replace value
};

/**
 * Check if a field name should be redacted
 *
 * @param fieldName - Field name to check
 * @returns True if field should be redacted
 */
export function shouldRedact(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase();
  return REDACTED_FIELDS.some((redacted) =>
    normalized.includes(redacted.toLowerCase())
  );
}
