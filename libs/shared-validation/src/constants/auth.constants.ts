import { PASSWORD_POLICY } from '@my-many-books/shared-types';

export const PASSWORD_CONSTRAINTS = Object.freeze({
  MIN_LENGTH: PASSWORD_POLICY.MIN_LENGTH,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: PASSWORD_POLICY.REQUIRE_UPPERCASE,
  REQUIRE_LOWERCASE: PASSWORD_POLICY.REQUIRE_LOWERCASE,
  REQUIRE_NUMBERS: PASSWORD_POLICY.REQUIRE_NUMBERS,
  REQUIRE_SYMBOLS: PASSWORD_POLICY.REQUIRE_SYMBOLS,
} as const);

export const PASSWORD_ERROR_MESSAGES = Object.freeze({
  REQUIRED: 'Password is required',
  TOO_SHORT: `Password must be at least ${PASSWORD_CONSTRAINTS.MIN_LENGTH} characters`,
  TOO_LONG: `Password must be at most ${PASSWORD_CONSTRAINTS.MAX_LENGTH} characters`,
  MISSING_UPPERCASE: 'Password must include at least one uppercase letter',
  MISSING_LOWERCASE: 'Password must include at least one lowercase letter',
  MISSING_NUMBER: 'Password must include at least one number',
  MISSING_SYMBOL: 'Password must include at least one symbol',
  CONFIRM_PASSWORD_REQUIRED: 'Confirm password is required',
  MISMATCH: 'Passwords do not match',
} as const);
