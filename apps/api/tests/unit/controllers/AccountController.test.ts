import { AccountController } from '../../../src/controllers/AccountController';
import { UserService, UserServiceError } from '../../../src/services/user/UserService';
import { UniversalRequest } from '../../../src/types';
import { NextFunction, Request, Response } from 'express';

const mockSetRefreshTokenCookie = jest.fn();
jest.mock('../../../src/services/auth/cognitoPasswordService', () => ({
  cognitoPasswordService: {
    changePassword: jest.fn(),
  },
  COGNITO_PASSWORD_ERRORS: {
    INVALID_PASSWORD_POLICY_ERROR_NAME: 'InvalidPasswordPolicyError',
    COGNITO_CONFIG_ERROR_NAME: 'CognitoConfigurationError',
  },
}));

jest.mock('../../../src/services/auth/googleOAuth', () => ({
  setRefreshTokenCookie: (...args: unknown[]) => mockSetRefreshTokenCookie(...args),
}));

jest.mock('../../../src/constants/api', () => ({
  AUTH_COOKIE_PATH: '/api/v1/auth',
}));

const buildRequest = (overrides: Partial<UniversalRequest> = {}): UniversalRequest => ({
  headers: { 'accept-language': 'en' },
  queryStringParameters: {},
  params: { id: '1' },
  user: { id: 1, email: 'test@example.com', role: 'user', provider: 'cognito' },
  ...overrides,
});

const buildExpressReq = (overrides: Record<string, unknown> = {}): Request =>
  ({
    headers: { 'accept-language': 'en' },
    user: { id: 1, email: 'user@example.com', provider: 'cognito' },
    params: { id: '1' },
    body: { currentPassword: 'Current123', newPassword: 'New123!' },
    ...overrides,
  } as unknown as Request);

const buildRes = (): Response => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return res as unknown as Response;
};

const session = {
  accessToken: 'new-access',
  idToken: 'new-id',
  refreshToken: 'new-refresh',
  expiresIn: 3600,
};

const dbUser = {
  id: 1,
  email: 'user@example.com',
  name: 'John',
  surname: 'Doe',
  role: 'user',
  isActive: true,
};

describe('AccountController', () => {
  let controller: AccountController;
  let service: jest.Mocked<UserService>;

  beforeEach(() => {
    service = {
      initializeControllerContext: jest.fn(),
      deactivateAccount: jest.fn(),
      changePassword: jest.fn(),
      getUserById: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    controller = new AccountController(service);
    jest.clearAllMocks();
  });

  describe('deactivateAccount', () => {
    it('deactivates the account and returns 200', async () => {
      const response = await controller.deactivateAccount(buildRequest());
      expect(service.deactivateAccount).toHaveBeenCalledWith(1);
      expect(response.statusCode).toBe(200);
    });

    it('returns 401 when unauthenticated', async () => {
      const response = await controller.deactivateAccount(buildRequest({ user: undefined }));
      expect(response.statusCode).toBe(401);
    });

    it('returns 403 when accessing another user account', async () => {
      const response = await controller.deactivateAccount(
        buildRequest({ user: { id: 99, email: 'other@example.com', role: 'user', provider: 'cognito' } })
      );
      expect(response.statusCode).toBe(403);
    });

    it('maps UserServiceError USER_NOT_FOUND to 404', async () => {
      service.deactivateAccount.mockRejectedValue(new UserServiceError('USER_NOT_FOUND'));
      const response = await controller.deactivateAccount(buildRequest());
      expect(response.statusCode).toBe(404);
    });
  });

  describe('changePassword', () => {
    beforeEach(() => {
      service.changePassword.mockResolvedValue(session as any);
      service.getUserById.mockResolvedValue(dbUser as any);
    });

    it('changes password and returns tokens with refreshed cookie', async () => {
      const req = buildExpressReq();
      const res = buildRes();
      const next: NextFunction = jest.fn();

      await controller.changePassword(req, res, next);

      expect(service.changePassword).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          email: 'user@example.com',
          currentPassword: 'Current123',
          newPassword: 'New123!',
        })
      );
      expect(mockSetRefreshTokenCookie).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as jest.Mock).mock.calls[0][0];
      expect(body.data).toMatchObject({ changed: true, accessToken: 'new-access', idToken: 'new-id' });
    });

    it('returns 401 when user is not authenticated', async () => {
      const req = buildExpressReq({ user: undefined });
      const res = buildRes();
      await controller.changePassword(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 400 when user id param is invalid', async () => {
      const req = buildExpressReq({ params: { id: 'abc' } });
      const res = buildRes();
      await controller.changePassword(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 403 when changing another user password', async () => {
      const req = buildExpressReq({ user: { id: 99, email: 'other@example.com' } as any });
      const res = buildRes();
      await controller.changePassword(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 when passwords are missing', async () => {
      const req = buildExpressReq({ body: {} });
      const res = buildRes();
      await controller.changePassword(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 for invalid password policy', async () => {
      const err = Object.assign(new Error('too weak'), { name: 'InvalidPasswordPolicyError' });
      service.changePassword.mockRejectedValue(err);
      const res = buildRes();
      await controller.changePassword(buildExpressReq(), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 401 for wrong current password', async () => {
      const err = Object.assign(new Error('wrong'), { name: 'NotAuthorizedException' });
      service.changePassword.mockRejectedValue(err);
      const res = buildRes();
      await controller.changePassword(buildExpressReq(), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 429 for rate limit exceeded', async () => {
      const err = Object.assign(new Error('limit'), { name: 'LimitExceededException' });
      service.changePassword.mockRejectedValue(err);
      const res = buildRes();
      await controller.changePassword(buildExpressReq(), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('returns 500 for Cognito config error', async () => {
      const err = Object.assign(new Error('config'), { name: 'CognitoConfigurationError' });
      service.changePassword.mockRejectedValue(err);
      const res = buildRes();
      await controller.changePassword(buildExpressReq(), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('calls next for unknown errors', async () => {
      const err = new Error('unexpected');
      service.changePassword.mockRejectedValue(err);
      const next: NextFunction = jest.fn();
      await controller.changePassword(buildExpressReq(), buildRes(), next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
