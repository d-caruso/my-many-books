/**
 * User-related type definitions
 */

export interface User {
  id: number;
  email: string;
  name: string;
  surname: string;
  isActive: boolean;
  creationDate: string;
  updateDate: string;
}

export interface AuthUser {
  userId: number;
  email: string;
  provider: string;
  providerUserId?: string;
  isNewUser?: boolean;
}