import { UserApi } from '../user-api';
import { MockHttpClient } from '../__mocks__/MockHttpClient';
import { ZodError } from 'zod';
import { UserProfile } from '@my-many-books/shared-types';

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

});
