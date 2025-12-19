import { AuthManager, type AuthAPI, type TokenStorage } from '../AuthManager';

const createMocks = () => {
  const api: jest.Mocked<AuthAPI> = {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    getCurrentUser: jest.fn(),
  };

  const tokenStorage: jest.Mocked<TokenStorage> = {
    getToken: jest.fn(),
    setToken: jest.fn(),
    removeToken: jest.fn(),
  };

  return { api, tokenStorage };
};

describe('AuthManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('validates email format', async () => {
      const { api, tokenStorage } = createMocks();
      const manager = new AuthManager(api, tokenStorage);

      await expect(manager.login('not-an-email', 'Abcdef1')).rejects.toThrow(
        'Invalid email format'
      );
      expect(api.login).not.toHaveBeenCalled();
    });

    it('validates password length', async () => {
      const { api, tokenStorage } = createMocks();
      const manager = new AuthManager(api, tokenStorage);

      await expect(manager.login('user@example.com', '123')).rejects.toThrow(
        'Password must be at least 6 characters long'
      );
      expect(api.login).not.toHaveBeenCalled();
    });

    it('cleans email and stores token on success', async () => {
      const { api, tokenStorage } = createMocks();
      const manager = new AuthManager(api, tokenStorage);

      api.login.mockResolvedValue({
        user: { userId: 1, email: 'user@example.com', provider: 'cognito' },
        token: 'jwt-token',
      });

      const result = await manager.login('  USER@Example.com  ', 'Abcdef1');

      expect(api.login).toHaveBeenCalledWith('user@example.com', 'Abcdef1');
      expect(tokenStorage.setToken).toHaveBeenCalledWith('jwt-token');
      expect(result.token).toBe('jwt-token');
    });

    it('wraps API errors', async () => {
      const { api, tokenStorage } = createMocks();
      const manager = new AuthManager(api, tokenStorage);

      api.login.mockRejectedValue(new Error('Bad credentials'));

      await expect(manager.login('user@example.com', 'Abcdef1')).rejects.toThrow(
        'Bad credentials'
      );
    });
  });

  describe('register', () => {
    it('validates required fields', async () => {
      const { api, tokenStorage } = createMocks();
      const manager = new AuthManager(api, tokenStorage);

      await expect(
        manager.register({
          email: 'user@example.com',
          password: 'Abcdef1',
          name: '',
          surname: 'Doe',
        })
      ).rejects.toThrow('First name is required');

      await expect(
        manager.register({
          email: 'user@example.com',
          password: 'Abcdef1',
          name: 'Jane',
          surname: '',
        })
      ).rejects.toThrow('Last name is required');

      expect(api.register).not.toHaveBeenCalled();
    });

    it('requires a strong password', async () => {
      const { api, tokenStorage } = createMocks();
      const manager = new AuthManager(api, tokenStorage);

      await expect(
        manager.register({
          email: 'user@example.com',
          password: 'abcdef1',
          name: 'Jane',
          surname: 'Doe',
        })
      ).rejects.toThrow(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      );
    });

    it('cleans input and stores token on success', async () => {
      const { api, tokenStorage } = createMocks();
      const manager = new AuthManager(api, tokenStorage);

      api.register.mockResolvedValue({
        user: { userId: 1, email: 'user@example.com', provider: 'cognito' },
        token: 'jwt-token',
      });

      const result = await manager.register({
        email: '  USER@Example.com  ',
        password: 'Abcdef1',
        name: '  Jane  ',
        surname: '  Doe ',
      });

      expect(api.register).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'Abcdef1',
        name: 'Jane',
        surname: 'Doe',
      });
      expect(tokenStorage.setToken).toHaveBeenCalledWith('jwt-token');
      expect(result.token).toBe('jwt-token');
    });

    it('wraps API errors', async () => {
      const { api, tokenStorage } = createMocks();
      const manager = new AuthManager(api, tokenStorage);

      api.register.mockRejectedValue({ message: 'Email already exists' });

      await expect(
        manager.register({
          email: 'user@example.com',
          password: 'Abcdef1',
          name: 'Jane',
          surname: 'Doe',
        })
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('logout', () => {
    it('removes the token even if API logout fails', async () => {
      const { api, tokenStorage } = createMocks();
      const manager = new AuthManager(api, tokenStorage);

      jest.spyOn(console, 'warn').mockImplementation(() => {});
      api.logout.mockRejectedValue(new Error('Network error'));

      await manager.logout();

      expect(api.logout).toHaveBeenCalled();
      expect(tokenStorage.removeToken).toHaveBeenCalled();
      (console.warn as jest.Mock).mockRestore?.();
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when a token exists', async () => {
      const { api, tokenStorage } = createMocks();
      const manager = new AuthManager(api, tokenStorage);

      tokenStorage.getToken.mockResolvedValue('token');

      await expect(manager.isAuthenticated()).resolves.toBe(true);
    });

    it('returns false when no token exists', async () => {
      const { api, tokenStorage } = createMocks();
      const manager = new AuthManager(api, tokenStorage);

      tokenStorage.getToken.mockResolvedValue(null);

      await expect(manager.isAuthenticated()).resolves.toBe(false);
    });

    it('returns false when token storage fails', async () => {
      const { api, tokenStorage } = createMocks();
      const manager = new AuthManager(api, tokenStorage);

      tokenStorage.getToken.mockRejectedValue(new Error('Storage error'));

      await expect(manager.isAuthenticated()).resolves.toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('returns null when no token exists', async () => {
      const { api, tokenStorage } = createMocks();
      const manager = new AuthManager(api, tokenStorage);

      tokenStorage.getToken.mockResolvedValue(null);

      await expect(manager.getCurrentUser()).resolves.toBeNull();
      expect(api.getCurrentUser).not.toHaveBeenCalled();
    });

    it('returns the user when token exists', async () => {
      const { api, tokenStorage } = createMocks();
      const manager = new AuthManager(api, tokenStorage);

      tokenStorage.getToken.mockResolvedValue('token');
      api.getCurrentUser.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        name: 'Jane',
        surname: 'Doe',
        isActive: true,
        role: 'user',
        creationDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
      });

      const user = await manager.getCurrentUser();

      expect(user?.email).toBe('user@example.com');
      expect(api.getCurrentUser).toHaveBeenCalledTimes(1);
    });

    it('refreshes token and retries on 401', async () => {
      const { api, tokenStorage } = createMocks();
      const manager = new AuthManager(api, tokenStorage);

      tokenStorage.getToken.mockResolvedValue('expired-token');
      api.getCurrentUser
        .mockRejectedValueOnce({ status: 401 })
        .mockResolvedValueOnce({
          id: 1,
          email: 'user@example.com',
          name: 'Jane',
          surname: 'Doe',
          isActive: true,
          role: 'user',
          creationDate: new Date().toISOString(),
          updateDate: new Date().toISOString(),
        });
      api.refreshToken.mockResolvedValue({ token: 'new-token' });

      const user = await manager.getCurrentUser();

      expect(api.refreshToken).toHaveBeenCalledTimes(1);
      expect(tokenStorage.setToken).toHaveBeenCalledWith('new-token');
      expect(api.getCurrentUser).toHaveBeenCalledTimes(2);
      expect(user).not.toBeNull();
    });

    it('clears token and returns null when refresh fails', async () => {
      const { api, tokenStorage } = createMocks();
      const manager = new AuthManager(api, tokenStorage);

      tokenStorage.getToken.mockResolvedValue('expired-token');
      api.getCurrentUser.mockRejectedValueOnce({ status: 401 });
      api.refreshToken.mockRejectedValueOnce(new Error('Refresh failed'));

      await expect(manager.getCurrentUser()).resolves.toBeNull();
      expect(tokenStorage.removeToken).toHaveBeenCalledTimes(1);
    });

    it('rethrows non-401 errors', async () => {
      const { api, tokenStorage } = createMocks();
      const manager = new AuthManager(api, tokenStorage);

      tokenStorage.getToken.mockResolvedValue('token');
      api.getCurrentUser.mockRejectedValueOnce({ status: 500, message: 'Boom' });

      await expect(manager.getCurrentUser()).rejects.toEqual({
        status: 500,
        message: 'Boom',
      });
    });
  });

  describe('validatePasswordRequirements', () => {
    it('returns detailed requirement status', () => {
      expect(AuthManager.validatePasswordRequirements('Abcdef1')).toEqual({
        isValid: true,
        requirements: {
          length: true,
          uppercase: true,
          lowercase: true,
          number: true,
        },
      });

      expect(AuthManager.validatePasswordRequirements('abcdef')).toEqual({
        isValid: false,
        requirements: {
          length: true,
          uppercase: false,
          lowercase: true,
          number: false,
        },
      });
    });
  });
});

