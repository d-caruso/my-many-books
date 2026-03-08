import { CognitoPasswordService, COGNITO_PASSWORD_ERRORS } from '../../../src/services/auth/cognitoPasswordService';

describe('CognitoPasswordService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      COGNITO_USER_POOL_CLIENT_ID: 'client-id',
      COGNITO_USER_POOL_ID: 'pool-id',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('changes password and returns a refreshed session', async () => {
    const send = jest
      .fn()
      .mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: 'current-access',
          IdToken: 'current-id',
          ExpiresIn: 3600,
        },
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: 'new-access',
          IdToken: 'new-id',
          RefreshToken: 'new-refresh',
          ExpiresIn: 3600,
        },
      });

    const service = new CognitoPasswordService({ send });

    const result = await service.changePassword({
      email: 'user@example.com',
      currentPassword: 'CurrentPass123',
      newPassword: 'NewPass123',
      locale: 'en',
    });

    expect(result).toEqual({
      accessToken: 'new-access',
      idToken: 'new-id',
      refreshToken: 'new-refresh',
      expiresIn: 3600,
    });
    expect(send.mock.calls).toHaveLength(4);
    expect(send.mock.calls.map((call) => call[0].constructor.name)).toEqual([
      'InitiateAuthCommand',
      'ChangePasswordCommand',
      'GlobalSignOutCommand',
      'InitiateAuthCommand',
    ]);
  });

  it('rejects weak passwords before calling Cognito', async () => {
    const send = jest.fn();
    const service = new CognitoPasswordService({ send });

    await expect(
      service.changePassword({
        email: 'user@example.com',
        currentPassword: 'CurrentPass123',
        newPassword: 'weak',
      })
    ).rejects.toMatchObject({
      name: COGNITO_PASSWORD_ERRORS.INVALID_PASSWORD_POLICY_ERROR_NAME,
    });

    expect(send).not.toHaveBeenCalled();
  });

  it('does not reveal unknown users during forgot-password request', async () => {
    const send = jest.fn().mockRejectedValue({ name: 'UserNotFoundException' });
    const service = new CognitoPasswordService({ send });

    await expect(
      service.requestForgotPassword({ email: 'missing@example.com' })
    ).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('confirms forgot-password and invalidates sessions', async () => {
    const send = jest.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({});
    const service = new CognitoPasswordService({ send });

    await service.confirmForgotPassword({
      email: 'user@example.com',
      code: '123456',
      newPassword: 'NewPass123',
      locale: 'it',
    });

    expect(send.mock.calls.map((call) => call[0].constructor.name)).toEqual([
      'ConfirmForgotPasswordCommand',
      'AdminUserGlobalSignOutCommand',
    ]);
  });

  it('throws configuration error if Cognito client id is missing', async () => {
    delete process.env['COGNITO_USER_POOL_CLIENT_ID'];
    const service = new CognitoPasswordService({ send: jest.fn() });

    await expect(
      service.requestForgotPassword({ email: 'user@example.com' })
    ).rejects.toMatchObject({
      name: COGNITO_PASSWORD_ERRORS.COGNITO_CONFIG_ERROR_NAME,
    });
  });
});
