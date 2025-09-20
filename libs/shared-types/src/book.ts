/**
 * Book-related type definitions
 */

import { Author } from './author';
import { Category } from './category';

export interface Book {
  id: number;
  isbnCode: string;
  title: string;
  editionNumber?: number;
  editionDate?: string;
  status?: BookStatus;
  notes?: string;
  userId?: number;
  authors?: Author[];
  categories?: Category[];
  creationDate: string;
  updateDate: string;
}

export type BookStatus = 'in progress' | 'paused' | 'finished';

export interface BookFormData {
  title: string;
  isbnCode: string;
  editionNumber?: number;
  editionDate?: string;
  status?: BookStatus;
  notes?: string;
  authorIds?: number[];
  categoryIds?: number[];
}

export interface BookCardProps {
  book: Book;
  onEdit?: (book: Book) => void;
  onDelete?: (bookId: number) => void;
  onStatusChange?: (bookId: number, status: BookStatus) => void;
}