// ================================================================
// src/services/authService.ts
// Auth service instance for mobile app
// ================================================================

import type {
  ConfirmPasswordResetResponse,
  ForgotPasswordResponse,
  RegisterResponse,
  User,
} from '@my-many-books/shared-auth';
import { AuthService } from '@my-many-books/shared-auth';
import { extractErrorMessage } from '@my-many-books/shared-utils';

import { emitAuthLifecycle, createAuthLifecyclePayload } from './hooks/authLifecycleEvents';
import { mobileHooks, MOBILE_EVENTS } from './hooks/mobileHooks';
import { MobileStorageAdapter } from './MobileStorageAdapter';
import { API_BASE_URL } from '../config/api';

export const authService = new AuthService({
  storage: new MobileStorageAdapter(),
  apiUrl: API_BASE_URL,
});

const buildUserResult = (user: User): { result: { user: Pick<User, 'id' | 'email' | 'role'> } } => ({
  result: {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  },
});

const baseLogin = authService.login.bind(authService);
authService.login = async (email: string, password: string): Promise<User> => {
  const payload = createAuthLifecyclePayload({
    email,
    provider: 'password',
    source: 'mobile_auth_service',
  });

  return emitAuthLifecycle(
    MOBILE_EVENTS.USER.LOGIN,
    payload,
    () => baseLogin(email, password),
    buildUserResult
  );
};

const baseGoogleLogin = authService.loginWithGoogleCode.bind(authService);
authService.loginWithGoogleCode = async (payload: {
  code: string;
  state: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<User> => {
  const hookPayload = createAuthLifecyclePayload({
    provider: 'google',
    source: 'mobile_auth_service',
  });

  return emitAuthLifecycle(
    MOBILE_EVENTS.USER.LOGIN,
    hookPayload,
    () => baseGoogleLogin(payload),
    buildUserResult
  );
};

const baseRegister = authService.register.bind(authService);
authService.register = async (userData: {
  email: string;
  password: string;
  name: string;
  surname: string;
  locale?: string;
}): Promise<RegisterResponse> => {
  const payload = createAuthLifecyclePayload({
    email: userData.email,
    locale: userData.locale,
    source: 'mobile_auth_service',
  });

  return emitAuthLifecycle(
    MOBILE_EVENTS.USER.REGISTER,
    payload,
    () => baseRegister(userData),
    (result) => ({ result })
  );
};

const baseLogout = authService.logout.bind(authService);
authService.logout = async (): Promise<string | null> => {
  const payload = createAuthLifecyclePayload({
    source: 'mobile_auth_service',
  });

  return emitAuthLifecycle(
    MOBILE_EVENTS.USER.LOGOUT,
    payload,
    () => baseLogout(),
    (cognitoLogoutUrl) => ({
      result: {
        cognitoLogoutUrl,
      },
    })
  );
};

const baseSilentRefresh = authService.silentRefresh.bind(authService);
authService.silentRefresh = async (): Promise<boolean> => {
  const payload = createAuthLifecyclePayload({
    source: 'mobile_auth_service',
  });

  await mobileHooks.emit(MOBILE_EVENTS.AUTH.REFRESH.BEFORE, payload);

  try {
    const refreshed = await baseSilentRefresh();

    if (refreshed) {
      await mobileHooks.emit(MOBILE_EVENTS.AUTH.REFRESH.AFTER, {
        ...payload,
        result: { refreshed: true },
      });
      return true;
    }

    await mobileHooks.emit(MOBILE_EVENTS.AUTH.REFRESH.FAILURE, {
      ...payload,
      error: 'Session refresh failed',
    });
    return false;
  } catch (error) {
    await mobileHooks.emit(MOBILE_EVENTS.AUTH.REFRESH.FAILURE, {
      ...payload,
      error: extractErrorMessage(error),
    });
    throw error;
  }
};

const baseVerifyEmail = authService.verifyEmail.bind(authService);
authService.verifyEmail = async (email: string, code: string): Promise<void> => {
  const payload = createAuthLifecyclePayload({
    email,
    codeLength: code.length,
    source: 'mobile_auth_service',
  });

  await emitAuthLifecycle(
    MOBILE_EVENTS.AUTH.VERIFY_EMAIL,
    payload,
    () => baseVerifyEmail(email, code)
  );
};

const baseResendCode = authService.resendCode.bind(authService);
authService.resendCode = async (email: string): Promise<void> => {
  const payload = createAuthLifecyclePayload({
    email,
    source: 'mobile_auth_service',
  });

  await emitAuthLifecycle(
    MOBILE_EVENTS.AUTH.RESEND_CODE,
    payload,
    () => baseResendCode(email)
  );
};

const baseChangePassword = authService.changePassword.bind(authService);
authService.changePassword = async (input: {
  userId: number;
  currentPassword: string;
  newPassword: string;
  locale?: string;
}): Promise<User> => {
  const payload = createAuthLifecyclePayload({
    userId: input.userId,
    locale: input.locale,
    source: 'mobile_auth_service',
  });

  return emitAuthLifecycle(
    MOBILE_EVENTS.USER.PASSWORD.CHANGE,
    payload,
    () => baseChangePassword(input),
    buildUserResult
  );
};

const baseRequestPasswordReset = authService.requestPasswordReset.bind(authService);
authService.requestPasswordReset = async (email: string): Promise<ForgotPasswordResponse> => {
  const payload = createAuthLifecyclePayload({
    email,
    source: 'mobile_auth_service',
  });

  return emitAuthLifecycle(
    MOBILE_EVENTS.AUTH.FORGOT_PASSWORD,
    payload,
    () => baseRequestPasswordReset(email),
    (result) => ({ result })
  );
};

const baseConfirmPasswordReset = authService.confirmPasswordReset.bind(authService);
authService.confirmPasswordReset = async (input: {
  email: string;
  code: string;
  newPassword: string;
  locale?: string;
}): Promise<ConfirmPasswordResetResponse> => {
  const payload = createAuthLifecyclePayload({
    email: input.email,
    codeLength: input.code.length,
    locale: input.locale,
    source: 'mobile_auth_service',
  });

  return emitAuthLifecycle(
    MOBILE_EVENTS.AUTH.RESET_PASSWORD,
    payload,
    () => baseConfirmPasswordReset(input),
    (result) => ({ result })
  );
};
