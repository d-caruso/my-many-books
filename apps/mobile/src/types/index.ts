// Import and re-export types from shared libraries with mobile-specific adaptations
import type {
  Book as SharedBook,
  BookStatus as SharedBookStatus,
  User as SharedUser,
  Author as SharedAuthor,
  Category as SharedCategory
} from '@my-many-books/shared-types';

// Sync status for offline operations
export type SyncStatus = 'synced' | 'pending' | 'failed' | 'syncing';

// Enhanced Book type for mobile with additional fields
export interface Book extends Omit<SharedBook, 'status' | 'creationDate' | 'updateDate'> {
  status: 'want-to-read' | 'reading' | 'paused' | 'completed';
  thumbnail?: string;
  description?: string;
  publishedDate?: string;
  pageCount?: number;
  rating?: number;
  creationDate: string;
  updateDate: string;
  serverId?: number; // Server-assigned ID for sync (Phase 5)
  // Offline sync fields
  _syncStatus?: SyncStatus;
  _tempId?: string;
  _deleted?: boolean;
  _serverUpdatedAt?: string;
}

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

// Re-export other shared types
export type { SharedAuthor as Author, SharedCategory as Category };

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

// Search types
export interface SearchResult<T = Book> {
  books: T[];
  total: number;
  hasMore: boolean;
}

export interface SearchQuery {
  q?: string;
  author?: string;
  category?: string;
  status?: Book['status'];
  limit?: number;
  offset?: number;
}
