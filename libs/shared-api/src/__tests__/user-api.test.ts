import { UserApi } from '../user-api';
import { MockHttpClient } from '../__mocks__/MockHttpClient';
import { ZodError } from 'zod';
import { AuthSession, RefreshTokenResponse, UserProfile } from '@my-many-books/shared-types';

describe('UserApi', () => {
  let mockHttpClient: MockHttpClient;
  let userApi: UserApi;

  const mockUser: UserProfile = {
    id: 1,
    email: 'user@example.com',
    name: 'Jane',
    surname: 'Doe',
    fullName: 'Jane Doe',
    isActive: true,
    role: 'user',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  };

  const mockAuthSession: AuthSession = {
    user: {
      userId: 1,
      email: 'user@example.com',
      provider: 'cognito',
      providerUserId: 'abc123',
      isNewUser: false,
    },
    token: 'jwt-token',
  };

  const mockRefreshToken: RefreshTokenResponse = {
    token: 'refreshed-jwt-token',
  };

  beforeEach(() => {
    mockHttpClient = new MockHttpClient();
    userApi = new UserApi(mockHttpClient, {
      baseURL: 'https://api.example.com',
    });
  });

  afterEach(() => {
    mockHttpClient.reset();
  });

  describe('getCurrentUser', () => {
    it('should fetch the current user', async () => {
      mockHttpClient.setResponse('/users', {
        data: mockUser,
        status: 200,
      });

      const result = await userApi.getCurrentUser();

      expect(result).toEqual(mockUser);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('GET');
      expect(lastRequest?.url).toContain('/users');
    });

    it('should validate response against UserSchema', async () => {
      mockHttpClient.setResponse('/users', {
        data: { id: 1, email: 'not-an-email' },
        status: 200,
      });

      await expect(userApi.getCurrentUser()).rejects.toThrow(ZodError);
    });

    it('should propagate HTTP errors', async () => {
      mockHttpClient.setResponse('/users', {
        data: { error: 'Unauthorized' },
        status: 401,
      });

      await expect(userApi.getCurrentUser()).rejects.toThrow('HTTP Error 401');
    });
  });

  describe('updateProfile', () => {
    it('should update the current user profile via PUT', async () => {
      const updateData = { name: 'Updated', surname: 'User' };
      mockHttpClient.setResponse('/users', {
        data: { ...mockUser, ...updateData },
        status: 200,
      });

      const result = await userApi.updateProfile(updateData);

      expect(result.name).toBe('Updated');
      expect(result.surname).toBe('User');
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('PUT');
      expect(lastRequest?.url).toContain('/users');
      expect(lastRequest?.data).toEqual(updateData);
    });

    it('should validate response against UserSchema', async () => {
      mockHttpClient.setResponse('/users', {
        data: { id: 1, email: 'user@example.com' },
        status: 200,
      });

      await expect(userApi.updateProfile({ name: 'Updated', surname: 'User' })).rejects.toThrow(
        ZodError
      );
    });
  });

  describe('deleteAccount', () => {
    it('should delete the current user account', async () => {
      mockHttpClient.setResponse('/users', {
        data: undefined,
        status: 204,
      });

      await userApi.deleteAccount();

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('DELETE');
      expect(lastRequest?.url).toContain('/users');
    });

    it('should propagate HTTP errors', async () => {
      mockHttpClient.setResponse('/users', {
        data: { error: 'Forbidden' },
        status: 403,
      });

      await expect(userApi.deleteAccount()).rejects.toThrow('HTTP Error 403');
    });
  });

  describe('login', () => {
    it('should login with email and password', async () => {
      mockHttpClient.setResponse('/auth/login', {
        data: mockAuthSession,
        status: 200,
      });

      const result = await userApi.login('user@example.com', 'password123');

      expect(result).toEqual(mockAuthSession);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('POST');
      expect(lastRequest?.url).toContain('/auth/login');
      expect(lastRequest?.data).toEqual({
        email: 'user@example.com',
        password: 'password123',
      });
    });

    it('should validate response against AuthSessionSchema', async () => {
      mockHttpClient.setResponse('/auth/login', {
        data: { token: '' },
        status: 200,
      });

      await expect(userApi.login('user@example.com', 'password123')).rejects.toThrow(
        ZodError
      );
    });
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerData = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New',
        surname: 'User',
      };
      mockHttpClient.setResponse('/auth/register', {
        data: mockAuthSession,
        status: 201,
      });

      const result = await userApi.register(registerData);

      expect(result).toEqual(mockAuthSession);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('POST');
      expect(lastRequest?.url).toContain('/auth/register');
      expect(lastRequest?.data).toEqual(registerData);
    });
  });

  describe('logout', () => {
    it('should logout via POST', async () => {
      mockHttpClient.setResponse('/auth/logout', {
        data: undefined,
        status: 204,
      });

      await userApi.logout();

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('POST');
      expect(lastRequest?.url).toContain('/auth/logout');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token via POST', async () => {
      mockHttpClient.setResponse('/auth/refresh', {
        data: mockRefreshToken,
        status: 200,
      });

      const result = await userApi.refreshToken();

      expect(result).toEqual(mockRefreshToken);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('POST');
      expect(lastRequest?.url).toContain('/auth/refresh');
    });

    it('should validate response against RefreshTokenSchema', async () => {
      mockHttpClient.setResponse('/auth/refresh', {
        data: { token: '' },
        status: 200,
      });

      await expect(userApi.refreshToken()).rejects.toThrow(ZodError);
    });
  });
});
