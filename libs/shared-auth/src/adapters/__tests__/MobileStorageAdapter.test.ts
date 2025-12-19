import type { AuthTokens, User } from '../../types';

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
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('reads/writes/removes tokens and user via expo-secure-store', async () => {
    const secureStore = {
      getItemAsync: jest
        .fn()
        .mockResolvedValueOnce(JSON.stringify(tokens))
        .mockResolvedValueOnce(JSON.stringify(user)),
      setItemAsync: jest.fn().mockResolvedValue(undefined),
      deleteItemAsync: jest.fn().mockResolvedValue(undefined),
    };

    let adapter: any;
    jest.isolateModules(() => {
      jest.doMock('expo-secure-store', () => secureStore, { virtual: true });
      const { MobileStorageAdapter } = require('../MobileStorageAdapter');
      adapter = new MobileStorageAdapter();
    });

    await expect(adapter.getTokens()).resolves.toEqual(tokens);
    expect(secureStore.getItemAsync).toHaveBeenCalledWith('auth_tokens');

    await expect(adapter.getUser()).resolves.toEqual(user);
    expect(secureStore.getItemAsync).toHaveBeenCalledWith('auth_user');

    await expect(adapter.setTokens(tokens)).resolves.toBeUndefined();
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('auth_tokens', JSON.stringify(tokens));

    await expect(adapter.setUser(user)).resolves.toBeUndefined();
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('auth_user', JSON.stringify(user));

    await expect(adapter.removeTokens()).resolves.toBeUndefined();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('auth_tokens');

    await expect(adapter.removeUser()).resolves.toBeUndefined();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('auth_user');

    await expect(adapter.clear()).resolves.toBeUndefined();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledTimes(4);
  });

  it('returns null on SecureStore read errors and logs errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const secureStore = {
      getItemAsync: jest.fn().mockRejectedValue(new Error('read-fail')),
      setItemAsync: jest.fn().mockResolvedValue(undefined),
      deleteItemAsync: jest.fn().mockResolvedValue(undefined),
    };

    let adapter: any;
    jest.isolateModules(() => {
      jest.doMock('expo-secure-store', () => secureStore, { virtual: true });
      const { MobileStorageAdapter } = require('../MobileStorageAdapter');
      adapter = new MobileStorageAdapter();
    });

    await expect(adapter.getTokens()).resolves.toBeNull();
    await expect(adapter.getUser()).resolves.toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to get tokens:', expect.any(Error));
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to get user:', expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it('throws on SecureStore write errors and logs errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const secureStore = {
      getItemAsync: jest.fn(),
      setItemAsync: jest.fn().mockRejectedValue(new Error('write-fail')),
      deleteItemAsync: jest.fn(),
    };

    let adapter: any;
    jest.isolateModules(() => {
      jest.doMock('expo-secure-store', () => secureStore, { virtual: true });
      const { MobileStorageAdapter } = require('../MobileStorageAdapter');
      adapter = new MobileStorageAdapter();
    });

    await expect(adapter.setTokens(tokens)).rejects.toThrow('write-fail');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to set tokens:', expect.any(Error));

    await expect(adapter.setUser(user)).rejects.toThrow('write-fail');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to set user:', expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it('logs delete errors but does not throw on removeTokens/removeUser', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const secureStore = {
      getItemAsync: jest.fn(),
      setItemAsync: jest.fn(),
      deleteItemAsync: jest.fn().mockRejectedValue(new Error('delete-fail')),
    };

    let adapter: any;
    jest.isolateModules(() => {
      jest.doMock('expo-secure-store', () => secureStore, { virtual: true });
      const { MobileStorageAdapter } = require('../MobileStorageAdapter');
      adapter = new MobileStorageAdapter();
    });

    await expect(adapter.removeTokens()).resolves.toBeUndefined();
    await expect(adapter.removeUser()).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to remove tokens:', expect.any(Error));
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to remove user:', expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it('warns and throws if expo-secure-store is unavailable', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    let adapter: any;
    jest.isolateModules(() => {
      jest.doMock(
        'expo-secure-store',
        () => {
          throw new Error('not installed');
        },
        { virtual: true }
      );
      const { MobileStorageAdapter } = require('../MobileStorageAdapter');
      adapter = new MobileStorageAdapter();
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'expo-secure-store not available. MobileStorageAdapter will not work.'
    );

    await expect(adapter.getTokens()).rejects.toThrow('expo-secure-store not available');
    await expect(adapter.setTokens(tokens)).rejects.toThrow('expo-secure-store not available');
    await expect(adapter.getUser()).rejects.toThrow('expo-secure-store not available');
    await expect(adapter.setUser(user)).rejects.toThrow('expo-secure-store not available');
    await expect(adapter.removeTokens()).rejects.toThrow('expo-secure-store not available');
    await expect(adapter.removeUser()).rejects.toThrow('expo-secure-store not available');
    await expect(adapter.clear()).rejects.toThrow('expo-secure-store not available');

    consoleWarnSpy.mockRestore();
  });
});
