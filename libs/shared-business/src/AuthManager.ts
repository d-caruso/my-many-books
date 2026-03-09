/**
 * Authentication business logic manager - platform agnostic
 */

import {
  AuthUser,
  PASSWORD_POLICY,
  PASSWORD_RULE_PATTERNS,
  PasswordRuleType,
  User,
} from '@my-many-books/shared-types';
import * as enCommonRaw from '@my-many-books/shared-i18n/src/locales/en/common.json';
import * as enValidationRaw from '@my-many-books/shared-i18n/src/locales/en/validation.json';
import { isValidEmail } from '@my-many-books/shared-utils';

const HTTP_STATUS_UNAUTHORIZED = 401;

interface CommonMessages {
  email_invalid: string;
  first_name: string;
  last_name: string;
  login_failed: string;
  registration_failed: string;
  password_requirements: string;
  password_rule_uppercase: string;
  password_rule_lowercase: string;
  password_rule_numbers: string;
  password_rule_symbols: string;
}

interface ValidationMessages {
  field_required: string;
}

const enCommon = enCommonRaw as unknown as CommonMessages;
const enValidation = enValidationRaw as unknown as ValidationMessages;

const formatMessage = (
  template: string,
  params: Record<string, string | number>
): string => template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => String(params[key] ?? ''));

const REQUIRED_PASSWORD_RULE_TYPES: PasswordRuleType[] = [
  ...(PASSWORD_POLICY.REQUIRE_UPPERCASE ? (['uppercase'] as const) : []),
  ...(PASSWORD_POLICY.REQUIRE_LOWERCASE ? (['lowercase'] as const) : []),
  ...(PASSWORD_POLICY.REQUIRE_NUMBERS ? (['numbers'] as const) : []),
  ...(PASSWORD_POLICY.REQUIRE_SYMBOLS ? (['symbols'] as const) : []),
];

const PASSWORD_RULE_LABELS: Record<PasswordRuleType, string> = {
  uppercase: enCommon.password_rule_uppercase,
  lowercase: enCommon.password_rule_lowercase,
  numbers: enCommon.password_rule_numbers,
  symbols: enCommon.password_rule_symbols,
};

const PASSWORD_REQUIRED_TYPES_LABEL = REQUIRED_PASSWORD_RULE_TYPES
  .map((ruleType) => PASSWORD_RULE_LABELS[ruleType])
  .join(', ');

const PASSWORD_REQUIREMENTS_ERROR = formatMessage(enCommon.password_requirements, {
  minLength: PASSWORD_POLICY.MIN_LENGTH,
  requiredTypes: PASSWORD_REQUIRED_TYPES_LABEL,
});

const INVALID_EMAIL_FORMAT_ERROR = enCommon.email_invalid;
const INVALID_PASSWORD_LENGTH_ERROR = PASSWORD_REQUIREMENTS_ERROR;
const FIRST_NAME_REQUIRED_ERROR = formatMessage(enValidation.field_required, {
  field: enCommon.first_name,
});
const LAST_NAME_REQUIRED_ERROR = formatMessage(enValidation.field_required, {
  field: enCommon.last_name,
});
const WEAK_PASSWORD_ERROR = PASSWORD_REQUIREMENTS_ERROR;
const LOGIN_FAILED_ERROR = enCommon.login_failed;
const REGISTRATION_FAILED_ERROR = enCommon.registration_failed;

export interface AuthAPI {
  login(email: string, password: string): Promise<{ user: AuthUser; token: string }>;
  register(userData: RegisterData): Promise<{ user: AuthUser; token: string }>;
  logout(): Promise<void>;
  refreshToken(): Promise<{ token: string }>;
  getCurrentUser(): Promise<User>;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  surname: string;
}

export interface TokenStorage {
  getToken(): Promise<string | null> | string | null;
  setToken(token: string): Promise<void> | void;
  removeToken(): Promise<void> | void;
}

export class AuthManager {
  constructor(
    private api: AuthAPI,
    private tokenStorage: TokenStorage
  ) {}

  /**
   * Login with validation
   */
  async login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
    const cleanedEmail = email.toLowerCase().trim();

    // Validate email format
    if (!isValidEmail(cleanedEmail)) {
      throw new Error(INVALID_EMAIL_FORMAT_ERROR);
    }

    // Validate password
    if (!password || password.length < PASSWORD_POLICY.MIN_LENGTH) {
      throw new Error(INVALID_PASSWORD_LENGTH_ERROR);
    }

    try {
      const result = await this.api.login(cleanedEmail, password);

      // Store token
      await this.tokenStorage.setToken(result.token);

      return result;
    } catch (error: unknown) {
      throw new Error(this.getErrorMessage(error, LOGIN_FAILED_ERROR));
    }
  }

  /**
   * Register with validation
   */
  async register(userData: RegisterData): Promise<{ user: AuthUser; token: string }> {
    const cleanedEmail = userData.email.toLowerCase().trim();

    // Validate email
    if (!isValidEmail(cleanedEmail)) {
      throw new Error(INVALID_EMAIL_FORMAT_ERROR);
    }

    // Validate password
    if (!userData.password || userData.password.length < PASSWORD_POLICY.MIN_LENGTH) {
      throw new Error(INVALID_PASSWORD_LENGTH_ERROR);
    }

    // Validate name
    if (!userData.name?.trim()) {
      throw new Error(FIRST_NAME_REQUIRED_ERROR);
    }

    if (!userData.surname?.trim()) {
      throw new Error(LAST_NAME_REQUIRED_ERROR);
    }

    // Check for strong password
    if (!this.isStrongPassword(userData.password)) {
      throw new Error(WEAK_PASSWORD_ERROR);
    }

    try {
      const cleanedData: RegisterData = {
        email: cleanedEmail,
        password: userData.password,
        name: userData.name.trim(),
        surname: userData.surname.trim(),
      };

      const result = await this.api.register(cleanedData);

      // Store token
      await this.tokenStorage.setToken(result.token);

      return result;
    } catch (error: unknown) {
      throw new Error(this.getErrorMessage(error, REGISTRATION_FAILED_ERROR));
    }
  }

  /**
   * Logout and clear tokens
   */
  async logout(): Promise<void> {
    try {
      await this.api.logout();
    } catch {
      // Continue logout flow even if API logout fails.
    } finally {
      // Always remove token from storage
      await this.tokenStorage.removeToken();
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.tokenStorage.getToken();
      return !!token;
    } catch {
      return false;
    }
  }

  /**
   * Get current user with token refresh if needed
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const token = await this.tokenStorage.getToken();
      if (!token) {
        return null;
      }

      return await this.api.getCurrentUser();
    } catch (error: unknown) {
      // If token is invalid, try to refresh
      if (this.getErrorStatus(error) === HTTP_STATUS_UNAUTHORIZED) {
        try {
          const refreshResult = await this.api.refreshToken();
          await this.tokenStorage.setToken(refreshResult.token);
          return await this.api.getCurrentUser();
        } catch {
          // Refresh failed, user needs to login again
          await this.tokenStorage.removeToken();
          return null;
        }
      }
      throw error;
    }
  }

  /**
   * Validate password strength
   */
  private isStrongPassword(password: string): boolean {
    if (PASSWORD_POLICY.REQUIRE_UPPERCASE && !PASSWORD_RULE_PATTERNS.uppercase.test(password)) {
      return false;
    }

    if (PASSWORD_POLICY.REQUIRE_LOWERCASE && !PASSWORD_RULE_PATTERNS.lowercase.test(password)) {
      return false;
    }

    if (PASSWORD_POLICY.REQUIRE_NUMBERS && !PASSWORD_RULE_PATTERNS.numbers.test(password)) {
      return false;
    }

    if (PASSWORD_POLICY.REQUIRE_SYMBOLS && !PASSWORD_RULE_PATTERNS.symbols.test(password)) {
      return false;
    }

    return true;
  }

  private getErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'object' && error !== null) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    return fallbackMessage;
  }

  private getErrorStatus(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null) {
      return undefined;
    }

    const status = (error as { status?: unknown }).status;
    return typeof status === 'number' ? status : undefined;
  }

  /**
   * Check password requirements
   */
  static validatePasswordRequirements(password: string): {
    isValid: boolean;
    requirements: {
      length: boolean;
      uppercase: boolean;
      lowercase: boolean;
      number: boolean;
    };
  } {
    const requirements = {
      length: password.length >= PASSWORD_POLICY.MIN_LENGTH,
      uppercase: !PASSWORD_POLICY.REQUIRE_UPPERCASE || PASSWORD_RULE_PATTERNS.uppercase.test(password),
      lowercase: !PASSWORD_POLICY.REQUIRE_LOWERCASE || PASSWORD_RULE_PATTERNS.lowercase.test(password),
      number: !PASSWORD_POLICY.REQUIRE_NUMBERS || PASSWORD_RULE_PATTERNS.numbers.test(password),
    };

    const isValid = Object.values(requirements).every((req) => req);

    return { isValid, requirements };
  }
}
