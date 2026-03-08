export const POST_LOGIN_WELCOME_STORAGE_KEY = 'post-login-welcome';

export const AUTH_ENDPOINTS = Object.freeze({
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  VERIFY_EMAIL: '/auth/verify-email',
  RESEND_CODE: '/auth/resend-code',
  FORGOT_PASSWORD: '/auth/forgot-password',
  CONFIRM_FORGOT_PASSWORD: '/auth/confirm-forgot-password',
  GOOGLE_MOBILE_EXCHANGE: '/auth/google/mobile/exchange',
} as const);

export const USER_ACCOUNT_PATCH_ACTIONS = Object.freeze({
  DEACTIVATE_ACCOUNT: 'deactivate_account',
  CHANGE_PASSWORD: 'change_password',
} as const);

export type UserAccountPatchAction =
  (typeof USER_ACCOUNT_PATCH_ACTIONS)[keyof typeof USER_ACCOUNT_PATCH_ACTIONS];

export const PASSWORD_POLICY = Object.freeze({
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SYMBOLS: false,
} as const);

export const PASSWORD_RULE_TYPES = Object.freeze([
  'uppercase',
  'lowercase',
  'numbers',
  'symbols',
] as const);

export type PasswordRuleType = (typeof PASSWORD_RULE_TYPES)[number];

export const PASSWORD_RULE_PATTERNS: Readonly<Record<PasswordRuleType, RegExp>> = Object.freeze({
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  numbers: /\d/,
  symbols: /[^A-Za-z0-9]/,
});

export const PASSWORD_RESET_POLICY = Object.freeze({
  TOKEN_TTL_MINUTES: 60,
} as const);
