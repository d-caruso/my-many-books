// ================================================================
// types.ts
// Type definitions for shared authentication library
// ================================================================

export interface User {
  id: number;
  email: string;
  name: string;
  surname: string;
  role: 'user' | 'admin';
  isActive: boolean;
  creationDate?: string;
  updateDate?: string;
}

export interface AuthTokens {
  idToken: string;
  accessToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

export interface StorageAdapter {
  getTokens(): Promise<AuthTokens | null>;
  setTokens(tokens: AuthTokens): Promise<void>;
  removeTokens(): Promise<void>;
  getUser(): Promise<User | null>;
  setUser(user: User): Promise<void>;
  removeUser(): Promise<void>;
  clear(): Promise<void>;
}

export interface AuthServiceConfig {
  storage: StorageAdapter;
  apiUrl: string;
  onAuthStateChange?: (user: User | null) => void;
  onTokenRefresh?: (tokens: AuthTokens) => void;
}

export interface LoginResponse {
  accessToken: string;
  idToken: string;
  expiresIn: number;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  idToken: string;
  expiresIn: number;
}

export interface RegisterResponse {
  success: boolean;
  requiresVerification: boolean;
  message: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
