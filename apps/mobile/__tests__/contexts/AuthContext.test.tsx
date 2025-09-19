import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { userAPI } from '@my-many-books/shared-api';

// Mock AsyncStorage
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Mock userAPI
const mockUserAPI = userAPI as jest.Mocked<typeof userAPI>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
  });

  describe('initialization', () => {
    it('should initialize without stored token', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBe(null);

      // Wait for initialization to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBe(null);
    });

    it('should initialize with stored token and valid user', async () => {
      const mockToken = 'stored-token';
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };

      mockAsyncStorage.getItem.mockResolvedValue(mockToken);
      mockUserAPI.getCurrentUser.mockResolvedValue(mockUser as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initialization to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toEqual(mockUser);
      expect(mockUserAPI.setAuthToken).toHaveBeenCalledWith(mockToken);
      expect(mockUserAPI.getCurrentUser).toHaveBeenCalled();
    });

    it('should handle stored token with invalid user', async () => {
      const mockToken = 'invalid-token';

      mockAsyncStorage.getItem.mockResolvedValue(mockToken);
      mockUserAPI.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initialization to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBe(null);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const mockResponse = {
        token: 'new-token',
        user: { id: 1, email: 'test@example.com', name: 'Test User' }
      };

      mockUserAPI.login.mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(result.current.user).toEqual(mockResponse.user);
      expect(result.current.isLoading).toBe(false);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('authToken', 'new-token');
      expect(mockUserAPI.setAuthToken).toHaveBeenCalledWith('new-token');
    });

    it('should handle login error', async () => {
      const errorMessage = 'Invalid credentials';
      mockUserAPI.login.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrongpassword');
        } catch (error) {
          expect(error.message).toBe(errorMessage);
        }
      });

      expect(result.current.user).toBe(null);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      const mockResponse = {
        token: 'new-token',
        user: { id: 1, email: 'test@example.com', name: 'Test User' }
      };

      mockUserAPI.register.mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.register('test@example.com', 'password123', 'Test User');
      });

      expect(result.current.user).toEqual(mockResponse.user);
      expect(result.current.isLoading).toBe(false);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('authToken', 'new-token');
      expect(mockUserAPI.setAuthToken).toHaveBeenCalledWith('new-token');
    });

    it('should handle register error', async () => {
      const errorMessage = 'Email already exists';
      mockUserAPI.register.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.register('test@example.com', 'password123', 'Test User');
        } catch (error) {
          expect(error.message).toBe(errorMessage);
        }
      });

      expect(result.current.user).toBe(null);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      // First login
      const mockResponse = {
        token: 'token',
        user: { id: 1, email: 'test@example.com', name: 'Test User' }
      };
      mockUserAPI.login.mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(result.current.user).toEqual(mockResponse.user);

      // Then logout
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBe(null);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(mockUserAPI.clearAuthToken).toHaveBeenCalled();
    });
  });

  describe('refreshUser', () => {
    it('should refresh user successfully', async () => {
      const mockUser = { id: 1, email: 'test@example.com', name: 'Updated User' };
      mockUserAPI.getCurrentUser.mockResolvedValue(mockUser as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(result.current.user).toEqual(mockUser);
      expect(mockUserAPI.getCurrentUser).toHaveBeenCalled();
    });

    it('should handle refresh user error by logging out', async () => {
      mockUserAPI.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(result.current.user).toBe(null);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(mockUserAPI.clearAuthToken).toHaveBeenCalled();
    });
  });

  it('should throw error when useAuth is used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });
});