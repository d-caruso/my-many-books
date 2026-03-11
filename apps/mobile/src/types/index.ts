// Import and re-export types from shared libraries with mobile-specific adaptations
import type {
  Book,
  User as SharedUser,
  SortDirection,
  BookFormData,
  SearchSortByField,
} from '@my-many-books/shared-types';

export type { Book };

export type MobileBookCreateData = BookFormData & { _tempId?: string };

/**
 * Book status enum values
 */
export const SYNC_STATUS = Object.freeze({
  SYNCED: 'synced',
  PENDING: 'pending',
  FAILED: 'failed',
  SYNCING: 'syncing',
} as const);

/**
 * Array of all sync status values (derived from SYNC_STATUS)
 */
export const SYNC_STATUSES = Object.freeze(
  Object.values(SYNC_STATUS)
) as readonly (typeof SYNC_STATUS[keyof typeof SYNC_STATUS])[];

// Sync status for offline operations
export type SyncStatus = typeof SYNC_STATUSES[number];

// Enhanced User type for mobile
export interface User extends SharedUser {
  avatar?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  language: string;
}

// Mobile-specific types

export interface CameraPermission {
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
  expires: string;
  granted: boolean;
}

export interface BarcodeData {
  type: string;
  data: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  tertiary: string;
  background: string;
  surface: string;
  text: string;
}

export interface AppTheme {
  colors: ThemeColors;
  dark: boolean;
}

export type StatusBarStyle = 'auto' | 'light' | 'dark';

export interface SearchQuery {
  page?: number;
  authorId?: number;
  categoryId?: number;
  status?: Book['status'];
  limit?: number;
  sortBy?: SearchSortByField;
  sortOrder?: SortDirection;
}

// API Response types
export interface ApiResponse<T = object> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// UI-layer shared types
export type { EntityMeta, UiBook } from './ui';
