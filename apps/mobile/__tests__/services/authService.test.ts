const baseAuthServiceMethods = {
  login: jest.fn(),
  loginWithGoogleCode: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  silentRefresh: jest.fn(),
  verifyEmail: jest.fn(),
  resendCode: jest.fn(),
  changePassword: jest.fn(),
  requestPasswordReset: jest.fn(),
  confirmPasswordReset: jest.fn(),
  getAuthState: jest.fn(),
  getIdToken: jest.fn(),
};

jest.mock('../../src/services/MobileStorageAdapter', () => ({
  MobileStorageAdapter: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../src/services/hooks/mobileHooks', () => {
  const actual = jest.requireActual('../../src/services/hooks/eventsSchema');
  return {
    mobileHooks: {
      emit: jest.fn().mockResolvedValue(undefined),
    },
    MOBILE_EVENTS: actual.MOBILE_EVENTS,
  };
});

jest.mock('@my-many-books/shared-auth', () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    ...baseAuthServiceMethods,
  })),
}));

describe('AuthService Instance', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should initialize with MobileStorageAdapter', async () => {
    await import('../../src/services/authService');
    const { AuthService } = await import('@my-many-books/shared-auth');
    const { MobileStorageAdapter } = await import('../../src/services/MobileStorageAdapter');

    expect(AuthService).toHaveBeenCalledTimes(1);
    expect(MobileStorageAdapter).toHaveBeenCalledTimes(1);
  });

  it('should configure AuthService with API_BASE_URL', async () => {
    const { API_BASE_URL } = await import('../../src/config/api');
    await import('../../src/services/authService');
    const { AuthService } = await import('@my-many-books/shared-auth');

    expect(AuthService).toHaveBeenCalledWith(
      expect.objectContaining({
        apiUrl: API_BASE_URL,
      })
    );
  });

  it('emits login lifecycle events', async () => {
    baseAuthServiceMethods.login.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      name: 'Test',
      surname: 'User',
      role: 'user',
      isActive: true,
    });

    const { authService } = await import('../../src/services/authService');
    const { mobileHooks, MOBILE_EVENTS } = await import('../../src/services/hooks/mobileHooks');

    await authService.login('user@example.com', 'Password123');

    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      1,
      MOBILE_EVENTS.USER.LOGIN.BEFORE,
      expect.objectContaining({
        metadata: expect.objectContaining({
          email: 'user@example.com',
          provider: 'password',
        }),
      })
    );
    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      2,
      MOBILE_EVENTS.USER.LOGIN.AFTER,
      expect.objectContaining({
        result: {
          user: {
            id: 1,
            email: 'user@example.com',
            role: 'user',
          },
        },
      })
    );
  });

  it('emits Google login lifecycle events', async () => {
    baseAuthServiceMethods.loginWithGoogleCode.mockResolvedValue({
      id: 2,
      email: 'google@example.com',
      name: 'Google',
      surname: 'User',
      role: 'user',
      isActive: true,
    });

    const { authService } = await import('../../src/services/authService');
    const { mobileHooks, MOBILE_EVENTS } = await import('../../src/services/hooks/mobileHooks');

    await authService.loginWithGoogleCode({
      code: 'code',
      state: 'state',
      redirectUri: 'app://auth',
      codeVerifier: 'verifier',
    });

    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      1,
      MOBILE_EVENTS.USER.LOGIN.BEFORE,
      expect.objectContaining({
        metadata: expect.objectContaining({
          provider: 'google',
        }),
      })
    );
    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      2,
      MOBILE_EVENTS.USER.LOGIN.AFTER,
      expect.objectContaining({
        result: {
          user: {
            id: 2,
            email: 'google@example.com',
            role: 'user',
          },
        },
      })
    );
  });

  it('emits register lifecycle events', async () => {
    baseAuthServiceMethods.register.mockResolvedValue({
      success: true,
      requiresVerification: true,
      message: 'Registration successful',
    });

    const { authService } = await import('../../src/services/authService');
    const { mobileHooks, MOBILE_EVENTS } = await import('../../src/services/hooks/mobileHooks');

    await authService.register({
      email: 'new@example.com',
      password: 'Password123',
      name: 'New',
      surname: 'User',
      locale: 'en',
    });

    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      1,
      MOBILE_EVENTS.USER.REGISTER.BEFORE,
      expect.objectContaining({
        metadata: expect.objectContaining({
          email: 'new@example.com',
          locale: 'en',
        }),
      })
    );
    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      2,
      MOBILE_EVENTS.USER.REGISTER.AFTER,
      expect.objectContaining({
        result: {
          success: true,
          requiresVerification: true,
          message: 'Registration successful',
        },
      })
    );
  });

  it('emits logout lifecycle events', async () => {
    baseAuthServiceMethods.logout.mockResolvedValue(null);

    const { authService } = await import('../../src/services/authService');
    const { mobileHooks, MOBILE_EVENTS } = await import('../../src/services/hooks/mobileHooks');

    await authService.logout();

    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      1,
      MOBILE_EVENTS.USER.LOGOUT.BEFORE,
      expect.any(Object)
    );
    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      2,
      MOBILE_EVENTS.USER.LOGOUT.AFTER,
      expect.objectContaining({
        result: {
          cognitoLogoutUrl: null,
        },
      })
    );
  });

  it('emits refresh failure lifecycle events', async () => {
    baseAuthServiceMethods.silentRefresh.mockResolvedValue(false);

    const { authService } = await import('../../src/services/authService');
    const { mobileHooks, MOBILE_EVENTS } = await import('../../src/services/hooks/mobileHooks');

    await expect(authService.silentRefresh()).resolves.toBe(false);

    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      1,
      MOBILE_EVENTS.AUTH.REFRESH.BEFORE,
      expect.any(Object)
    );
    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      2,
      MOBILE_EVENTS.AUTH.REFRESH.FAILURE,
      expect.objectContaining({
        error: 'Session refresh failed',
      })
    );
  });

  it('emits verify-email lifecycle events', async () => {
    baseAuthServiceMethods.verifyEmail.mockResolvedValue(undefined);

    const { authService } = await import('../../src/services/authService');
    const { mobileHooks, MOBILE_EVENTS } = await import('../../src/services/hooks/mobileHooks');

    await authService.verifyEmail('user@example.com', '123456');

    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      1,
      MOBILE_EVENTS.AUTH.VERIFY_EMAIL.BEFORE,
      expect.objectContaining({
        metadata: expect.objectContaining({
          email: 'user@example.com',
          codeLength: 6,
        }),
      })
    );
    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      2,
      MOBILE_EVENTS.AUTH.VERIFY_EMAIL.AFTER,
      expect.any(Object)
    );
  });

  it('emits resend-code lifecycle events', async () => {
    baseAuthServiceMethods.resendCode.mockResolvedValue(undefined);

    const { authService } = await import('../../src/services/authService');
    const { mobileHooks, MOBILE_EVENTS } = await import('../../src/services/hooks/mobileHooks');

    await authService.resendCode('user@example.com');

    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      1,
      MOBILE_EVENTS.AUTH.RESEND_CODE.BEFORE,
      expect.objectContaining({
        metadata: expect.objectContaining({
          email: 'user@example.com',
        }),
      })
    );
    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      2,
      MOBILE_EVENTS.AUTH.RESEND_CODE.AFTER,
      expect.any(Object)
    );
  });

  it('emits forgot-password lifecycle events', async () => {
    baseAuthServiceMethods.requestPasswordReset.mockResolvedValue({
      accepted: true,
      expiresInMinutes: 60,
    });

    const { authService } = await import('../../src/services/authService');
    const { mobileHooks, MOBILE_EVENTS } = await import('../../src/services/hooks/mobileHooks');

    await authService.requestPasswordReset('user@example.com');

    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      1,
      MOBILE_EVENTS.AUTH.FORGOT_PASSWORD.BEFORE,
      expect.objectContaining({
        metadata: expect.objectContaining({
          email: 'user@example.com',
        }),
      })
    );
    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      2,
      MOBILE_EVENTS.AUTH.FORGOT_PASSWORD.AFTER,
      expect.objectContaining({
        result: {
          accepted: true,
          expiresInMinutes: 60,
        },
      })
    );
  });

  it('emits reset-password lifecycle events', async () => {
    baseAuthServiceMethods.confirmPasswordReset.mockResolvedValue({
      reset: true,
      signInRequired: true,
    });

    const { authService } = await import('../../src/services/authService');
    const { mobileHooks, MOBILE_EVENTS } = await import('../../src/services/hooks/mobileHooks');

    await authService.confirmPasswordReset({
      email: 'user@example.com',
      code: '123456',
      newPassword: 'NewPassword1',
      locale: 'en',
    });

    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      1,
      MOBILE_EVENTS.AUTH.RESET_PASSWORD.BEFORE,
      expect.objectContaining({
        metadata: expect.objectContaining({
          email: 'user@example.com',
          codeLength: 6,
          locale: 'en',
        }),
      })
    );
    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      2,
      MOBILE_EVENTS.AUTH.RESET_PASSWORD.AFTER,
      expect.objectContaining({
        result: {
          reset: true,
          signInRequired: true,
        },
      })
    );
  });

  it('emits password-change lifecycle events', async () => {
    baseAuthServiceMethods.changePassword.mockResolvedValue({
      id: 7,
      email: 'user@example.com',
      name: 'Updated',
      surname: 'User',
      role: 'user',
      isActive: true,
    });

    const { authService } = await import('../../src/services/authService');
    const { mobileHooks, MOBILE_EVENTS } = await import('../../src/services/hooks/mobileHooks');

    await authService.changePassword({
      userId: 7,
      currentPassword: 'CurrentPass1',
      newPassword: 'NewPassword1',
      locale: 'en',
    });

    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      1,
      MOBILE_EVENTS.USER.PASSWORD.CHANGE.BEFORE,
      expect.objectContaining({
        metadata: expect.objectContaining({
          userId: 7,
          locale: 'en',
        }),
      })
    );
    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      2,
      MOBILE_EVENTS.USER.PASSWORD.CHANGE.AFTER,
      expect.objectContaining({
        result: {
          user: {
            id: 7,
            email: 'user@example.com',
            role: 'user',
          },
        },
      })
    );
  });
});
