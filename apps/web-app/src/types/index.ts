// API Types matching the backend exactly
export interface Book {
  id: number;
  isbnCode: string;
  title: string;
  editionNumber?: number;
  editionDate?: string;
  status?: 'in progress' | 'paused' | 'finished';
  notes?: string;
  userId?: number;
  authors?: Author[];
  categories?: Category[];
  creationDate: string;
  updateDate: string;
}

export interface Author {
  id: number;
  name: string;
  surname: string;
  nationality?: string;
  creationDate: string;
  updateDate: string;
}

export interface Category {
  id: number;
  name: string;
  creationDate: string;
  updateDate: string;
}

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

// API Response Types
export interface PaginatedResponse<T> {
  books?: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface ApiError {
  error: string;
  details?: string;
}

// Theme Types
export type ThemeName = 'default' | 'dark' | 'bookish' | 'forest' | 'ocean' | 'sunset' | 'lavender';

export interface Theme {
  name: ThemeName;
  displayName: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    surface: string;
    background: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    semantic: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
  };
}

// Component Props Types
export interface BookCardProps {
  book: Book;
  onEdit?: (book: Book) => void;
  onDelete?: (bookId: number) => void;
  onStatusChange?: (bookId: number, status: Book['status']) => void;
}

export interface SearchFilters {
  query?: string;
  status?: Book['status'];
  authorId?: number;
  categoryId?: number;
  sortBy?: 'title' | 'author' | 'date-added';
  page?: number;
  limit?: number;
}

// Search Results Types
export interface SearchResult {
  books: Book[];
  total: number;
  hasMore: boolean;
  page: number;
}

// ISBN Scanner Types
export interface ScanResult {
  isbn: string;
  success: boolean;
  error?: string;
}

// Form Types
export interface BookFormData {
  title: string;
  isbnCode: string;
  editionNumber?: number;
  editionDate?: string;
  status?: Book['status'];
  notes?: string;
  authorIds?: number[];
  categoryIds?: number[];
}