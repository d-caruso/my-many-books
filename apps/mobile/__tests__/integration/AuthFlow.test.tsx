import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { userAPI } from '@/services/api';

// Mock AsyncStorage and userAPI
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockUserAPI = userAPI as jest.Mocked<typeof userAPI>;

// Test component that uses auth
const TestAuthComponent = () => {
  const { user, login, register, logout, isLoading } = useAuth();
  
  return (
    <>
      {isLoading && <text testID="loading">Loading...</text>}
      {user ? (
        <>
          <text testID="user-name">{user.name}</text>
          <text testID="user-email">{user.email}</text>
          <text testID="logout-button" onPress={logout}>Logout</text>
        </>
      ) : (
        <>
          <text testID="not-authenticated">Not authenticated</text>
          <text 
            testID="login-button" 
            onPress={() => login('test@example.com', 'password123')}
          >
            Login
          </text>
          <text 
            testID="register-button" 
            onPress={() => register('test@example.com', 'password123', 'Test User')}
          >
            Register
          </text>
        </>
      )}
    </>
  );
};

describe('Auth Integration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
  });

  it('should complete full authentication flow', async () => {
    const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
    const mockLoginResponse = { token: 'auth-token', user: mockUser };
    
    mockUserAPI.login.mockResolvedValue(mockLoginResponse as any);

    const { getByTestId } = render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    // Should start unauthenticated
    await waitFor(() => {
      expect(getByTestId('not-authenticated')).toBeTruthy();
    });

    // Login
    fireEvent.press(getByTestId('login-button'));

    // Should show user info after login
    await waitFor(() => {
      expect(getByTestId('user-name')).toBeTruthy();
      expect(getByTestId('user-email')).toBeTruthy();
    });

    // Verify token was stored
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('authToken', 'auth-token');
    expect(mockUserAPI.setAuthToken).toHaveBeenCalledWith('auth-token');

    // Logout
    fireEvent.press(getByTestId('logout-button'));

    // Should be unauthenticated again
    await waitFor(() => {
      expect(getByTestId('not-authenticated')).toBeTruthy();
    });

    // Verify token was removed
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
    expect(mockUserAPI.clearAuthToken).toHaveBeenCalled();
  });

  it('should handle registration flow', async () => {
    const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
    const mockRegisterResponse = { token: 'auth-token', user: mockUser };
    
    mockUserAPI.register.mockResolvedValue(mockRegisterResponse as any);

    const { getByTestId } = render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    // Wait for initial state
    await waitFor(() => {
      expect(getByTestId('not-authenticated')).toBeTruthy();
    });

    // Register
    fireEvent.press(getByTestId('register-button'));

    // Should show user info after registration
    await waitFor(() => {
      expect(getByTestId('user-name')).toBeTruthy();
    });

    expect(mockUserAPI.register).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    });
  });

  it('should restore authentication from stored token', async () => {
    const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
    
    mockAsyncStorage.getItem.mockResolvedValue('stored-token');
    mockUserAPI.getCurrentUser.mockResolvedValue(mockUser as any);

    const { getByTestId } = render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    // Should show loading initially
    expect(getByTestId('loading')).toBeTruthy();

    // Should show user info after restoration
    await waitFor(() => {
      expect(getByTestId('user-name')).toBeTruthy();
    });

    expect(mockUserAPI.setAuthToken).toHaveBeenCalledWith('stored-token');
    expect(mockUserAPI.getCurrentUser).toHaveBeenCalled();
  });

  it('should handle expired token', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('expired-token');
    mockUserAPI.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));

    const { getByTestId } = render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    // Should eventually show not authenticated
    await waitFor(() => {
      expect(getByTestId('not-authenticated')).toBeTruthy();
    });

    // Should have removed the invalid token
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
  });
});