import type { AuthTokens, User } from '@my-many-books/shared-auth';
import { MobileStorageAdapter } from '../../src/services/MobileStorageAdapter';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}), { virtual: true });

const mockSecureStore = jest.requireMock<{
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
}>('expo-secure-store');

const tokens: AuthTokens = {
  idToken: 'id',
  accessToken: 'access',
  expiresAt: 123,
};

const user: User = {
  id: 1,
  email: 'test@example.com',
  name: 'Test',
  surname: 'User',
  role: 'user',
  isActive: true,
};

describe('MobileStorageAdapter', () => {
  let adapter: MobileStorageAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new MobileStorageAdapter();
  });

  it('reads/writes/removes tokens and user via expo-secure-store', async () => {
    mockSecureStore.getItemAsync
      .mockResolvedValueOnce(JSON.stringify(tokens))
      .mockResolvedValueOnce(JSON.stringify(user));
    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);

    await expect(adapter.getTokens()).resolves.toEqual(tokens);
    expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('auth_tokens');

    await expect(adapter.getUser()).resolves.toEqual(user);
    expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('auth_user');

    await expect(adapter.setTokens(tokens)).resolves.toBeUndefined();
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('auth_tokens', JSON.stringify(tokens));

    await expect(adapter.setUser(user)).resolves.toBeUndefined();
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('auth_user', JSON.stringify(user));

    await expect(adapter.removeTokens()).resolves.toBeUndefined();
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_tokens');

    await expect(adapter.removeUser()).resolves.toBeUndefined();
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_user');

    await expect(adapter.clear()).resolves.toBeUndefined();
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledTimes(4);
  });

  it('returns null on SecureStore read errors', async () => {
    mockSecureStore.getItemAsync.mockRejectedValue(new Error('read-fail'));

    await expect(adapter.getTokens()).resolves.toBeNull();
    await expect(adapter.getUser()).resolves.toBeNull();
  });

  it('throws on SecureStore write errors', async () => {
    mockSecureStore.setItemAsync.mockRejectedValue(new Error('write-fail'));

    await expect(adapter.setTokens(tokens)).rejects.toThrow('write-fail');
    await expect(adapter.setUser(user)).rejects.toThrow('write-fail');
  });

  it('does not throw on removeTokens/removeUser errors', async () => {
    mockSecureStore.deleteItemAsync.mockRejectedValue(new Error('delete-fail'));

    await expect(adapter.removeTokens()).resolves.toBeUndefined();
    await expect(adapter.removeUser()).resolves.toBeUndefined();
  });
});
